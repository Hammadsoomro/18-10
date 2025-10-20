import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ClaimItem {
  _id?: string;
  id?: string;
  lineNumber: number;
  content: string;
  claimedAt?: string;
  createdAt?: string;
  status: string;
}

interface QueuedLine {
  _id?: string;
  id?: string;
  lineNumber: number;
  content: string;
  status: string;
  createdAt?: string;
}

interface DistributorItem {
  id: string;
  lines: string[];
  assignedTo: string;
  distributedAt: string;
}

export default function Inbox() {
  const { token, user } = useAuth();
  const [claimCooldown, setClaimCooldown] = useState(0);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [queuedLines, setQueuedLines] = useState<QueuedLine[]>([]);
  const [distributorItems, setDistributorItems] = useState<DistributorItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const [claimSettingCooldown, setClaimSettingCooldown] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    fetchClaimSettings();
  }, [token]);

  const fetchClaimSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/claim-settings', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setClaimSettingCooldown(data.cooldownSeconds ?? null);
    } catch (e) {
      console.error('Failed to fetch claim settings', e);
    }
  };

  useEffect(() => {
    const onSettings = (e: any) => {
      const cs = e?.detail?.cooldownSeconds;
      if (typeof cs === 'number') setClaimSettingCooldown(cs);
    };
    window.addEventListener('claim_settings_updated', onSettings as EventListener);
    return () => window.removeEventListener('claim_settings_updated', onSettings as EventListener);
  }, []);

  // Cooldown persistence helpers
  const getCooldownKey = () => `claim_cooldown_${user?.id ?? "global"}`;
  const cooldownTimerRef = useRef<number | null>(null);

  const startCooldown = (seconds: number) => {
    if (!user) return;
    const expiry = Date.now() + seconds * 1000;
    try {
      localStorage.setItem(getCooldownKey(), String(expiry));
      window.dispatchEvent(
        new CustomEvent("claim_cooldown_updated", { detail: { expiry } }),
      );
    } catch (e) {
      // ignore
    }

    setClaimCooldown(seconds);

    if (cooldownTimerRef.current) {
      window.clearInterval(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = window.setInterval(() => {
      setClaimCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            window.clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          try {
            localStorage.removeItem(getCooldownKey());
            window.dispatchEvent(new CustomEvent("claim_cooldown_updated", {}));
          } catch (e) {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;
  };

  useEffect(() => {
    // Initialize cooldown from localStorage
    if (!user) return;
    const key = getCooldownKey();
    const value = localStorage.getItem(key);
    if (!value) return;
    const expiry = Number(value);
    if (isNaN(expiry)) return;
    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    if (remaining > 0) {
      startCooldown(remaining);
    } else {
      localStorage.removeItem(key);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        const v = localStorage.getItem(key);
        if (!v) {
          setClaimCooldown(0);
        } else {
          const exp = Number(v);
          const rem = Math.ceil((exp - Date.now()) / 1000);
          if (rem > 0) startCooldown(rem);
        }
      }
    };

    const onCustom = (e: any) => {
      const detail = e?.detail;
      if (!detail || !detail.expiry) return;
      const rem = Math.ceil((detail.expiry - Date.now()) / 1000);
      if (rem > 0) startCooldown(rem);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("claim_cooldown_updated", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("claim_cooldown_updated", onCustom as EventListener);
      if (cooldownTimerRef.current) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [user]);

  const fetchData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/numbers/lines", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch lines");
      const data = await response.json();

      // Filter queued lines (status: queued)
      const queued = data.lines.filter(
        (line: QueuedLine) => line.status === "queued",
      );
      setQueuedLines(queued);

      // Filter claimed lines (status: claimed)
      const claimed = data.lines.filter(
        (line: ClaimItem) => line.status === "claimed",
      );
      setClaims(claimed);
    } catch (error) {
      console.error("Error fetching lines:", error);
      toast.error("Failed to fetch lines");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (claimCooldown > 0) {
      toast.error("Still in cooldown");
      return;
    }

    if (queuedLines.length === 0) {
      toast.error("No lines available to claim");
      return;
    }

    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      // Step 1: Move all existing claimed lines to distributed
      if (claims.length > 0) {
        const claimedLineIds = claims.map((c) => c._id || c.id);
        const moveResponse = await fetch("/api/numbers/move-to-distributor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lineIds: claimedLineIds }),
        });

        if (!moveResponse.ok) throw new Error("Failed to move claimed lines");
      }

      // Step 2: Claim the next line
      const lineToClaimId = queuedLines[0]._id || queuedLines[0].id;
      const claimResponse = await fetch(`/api/numbers/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineId: lineToClaimId }),
      });

      if (!claimResponse.ok) {
        if (claimResponse.status === 409) {
          toast.error("Another member just claimed that line. Try again.");
          await fetchData();
          return;
        }
        throw new Error("Failed to claim line");
      }

      // Refetch data
      await fetchData();

      // start persistent cooldown using server setting (fallback 60s)
      startCooldown(claimSettingCooldown ?? 60);

      toast.success("Line claimed successfully!");
    } catch (error) {
      console.error("Error claiming line:", error);
      toast.error("Failed to claim line");
    }
  };

  const getClaimButtonColor = () => {
    if (claimCooldown > 0) return "bg-red-600 hover:bg-red-700";
    if (queuedLines.length === 0) return "bg-slate-400 cursor-not-allowed";
    return "bg-green-600 hover:bg-green-700";
  };

  const getClaimButtonText = () => {
    if (claimCooldown > 0) return `Cooldown: ${claimCooldown}s`;
    if (queuedLines.length === 0) return "No Lines Available";
    return "Claim Next Line";
  };

  const truncateText = (text: string, maxWords: number = 10) => {
    const words = text.split(" ");
    return words.length > maxWords
      ? words.slice(0, maxWords).join(" ") + "..."
      : text;
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateFormatted = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    return { time, dateFormatted };
  };

  return (
    <Layout title="Numbers Inbox">
      <div className="p-6">
        <Tabs defaultValue="claims" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="claims">Numbers Claim</TabsTrigger>
            <TabsTrigger value="distributor">Auto Distributor</TabsTrigger>
          </TabsList>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6 mt-6">
            {/* Claim Status Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardHeader>
                <CardTitle className="text-2xl">Claim Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                      claimCooldown > 0
                        ? "bg-red-200 dark:bg-red-900"
                        : "bg-green-200 dark:bg-green-900"
                    }`}
                  >
                    {claimCooldown > 0 ? (
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {claimCooldown > 0 ? "Cooldown Active" : "Ready to Claim"}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {queuedLines.length} line(s) available
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleClaim}
                  disabled={
                    queuedLines.length === 0 || claimCooldown > 0 || isLoading
                  }
                  className={`w-full text-white font-semibold py-6 ${getClaimButtonColor()}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    getClaimButtonText()
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Claims List */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Your Claimed Lines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {claims.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No claims yet
                  </p>
                ) : (
                  claims.map((claim) => {
                    const { time, dateFormatted } = formatDateTime(
                      claim.claimedAt || claim.createdAt,
                    );
                    return (
                      <div
                        key={claim._id || claim.id}
                        className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                            {truncateText(claim.content)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <Clock className="h-3 w-3" />
                            <span>{time}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {dateFormatted}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distributor Tab */}
          <TabsContent value="distributor" className="space-y-6 mt-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Auto Distributor Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {distributorItems.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No distributions yet
                  </p>
                ) : (
                  distributorItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-900"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {item.assignedTo}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.distributedAt}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded p-3 space-y-2">
                        {item.lines.map((line, idx) => (
                          <div
                            key={idx}
                            className="text-sm flex items-start gap-2"
                          >
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {truncateText(line, 15)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
