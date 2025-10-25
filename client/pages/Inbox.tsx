import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [tab, setTab] = useState<"claims" | "distributor">("claims");
  const [unreadDistributor, setUnreadDistributor] = useState<number>(0);

  const [claimSettingCooldown, setClaimSettingCooldown] = useState<
    number | null
  >(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchData();
    fetchClaimSettings();

    if (!token) return;
    try {
      const tokenRaw = localStorage.getItem("auth_token");
      const payload = tokenRaw
        ? JSON.parse(atob(tokenRaw.split(".")[1]))
        : null;
      const teamId = payload?.teamId;
      const userId = payload?.id;
      const s = io(undefined, { autoConnect: true });
      socketRef.current = s;
      s.on("connect", () => {
        if (teamId) s.emit("join_team", teamId);
      });

      s.on("distributed_lines", (data: any) => {
        // always refresh distributor assignments and, if relevant, inbox data
        try {
          fetchDistributorAssignments();
          if (tab !== "distributor") {
            setUnreadDistributor((prev) => {
              const inc = Array.isArray(data?.lines) ? data.lines.length : 0;
              return prev + inc;
            });
          }
        } catch (e) {}

        try {
          const lines = Array.isArray(data.lines) ? data.lines : [];
          const forMe = lines.some((l: any) => {
            const dt = Array.isArray(l.distributedTo)
              ? l.distributedTo.map(String)
              : [];
            return (
              dt.includes(String(userId)) ||
              String(l.claimedBy) === String(userId)
            );
          });
          if (forMe) {
            fetchData();
            // small toast
            // @ts-ignore
            import("sonner")
              .then(({ toast }) =>
                toast.success("You received new lines from Auto Distributor"),
              )
              .catch(() => {});
          }
        } catch (e) {}
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } catch (e) {
      console.error("Socket init error", e);
    }
  }, [token]);

  const fetchClaimSettings = async () => {
    if (!token) return;
    try {
      const apiUrl = `${window.location.origin}/api/auth/claim-settings`;
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setClaimSettingCooldown(data.cooldownSeconds ?? null);
    } catch (e) {
      console.error("Failed to fetch claim settings", e);
    }
  };

  const getDistributorLastReadKey = () => `distributor_last_read_${user?.id ?? "global"}`;

  const markDistributorRead = () => {
    try {
      localStorage.setItem(getDistributorLastReadKey(), String(Date.now()));
      setUnreadDistributor(0);
    } catch {}
  };

  const computeUnreadForDistributor = (items: DistributorItem[]) => {
    try {
      const last = Number(localStorage.getItem(getDistributorLastReadKey()) || 0);
      if (!last) return items.length;
      const count = items.filter((it) => {
        const t = Date.parse(it.distributedAt);
        return isNaN(t) ? false : t > last;
      }).length;
      return count;
    } catch {
      return items.length;
    }
  };

  const fetchDistributorAssignments = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${window.location.origin}/api/numbers/claimed-lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const lines = data.lines || [];
      // only include lines that were distributed by Auto Distributor (distributedTo populated)
      const distributed = lines.filter(
        (l: any) =>
          Array.isArray(l.distributedTo) && l.distributedTo.length > 0,
      );
      // group by claimedBy (assigned member)
      const map: Record<string, any> = {};
      for (const l of distributed) {
        const memberId =
          (l.claimedBy && (l.claimedBy._id || l.claimedBy)) ||
          String((l as any).claimedBy || "unknown");
        const memberName =
          (l.claimedBy && (l.claimedBy.name || l.claimedByName)) ||
          (l as any).claimedByName ||
          "Member";
        if (!map[memberId]) {
          map[memberId] = {
            assignedTo: memberName,
            distributedAt:
              l.claimedAt ||
              l.updatedAt ||
              l.createdAt ||
              new Date().toISOString(),
            lines: [],
          };
        }
        map[memberId].lines.push(l.content || l);
      }
      const items = Object.keys(map).map((k) => ({
        id: k + "_" + map[k].distributedAt,
        assignedTo: map[k].assignedTo,
        distributedAt: map[k].distributedAt,
        lines: map[k].lines,
      }));
      setDistributorItems(items);
      if (tab !== "distributor") {
        setUnreadDistributor(computeUnreadForDistributor(items));
      }
    } catch (e) {
      console.error("Failed to fetch distributor assignments", e);
    }
  };

  useEffect(() => {
    const onSettings = (e: any) => {
      const cs = e?.detail?.cooldownSeconds;
      if (typeof cs === "number") setClaimSettingCooldown(cs);
    };
    window.addEventListener(
      "claim_settings_updated",
      onSettings as EventListener,
    );
    return () =>
      window.removeEventListener(
        "claim_settings_updated",
        onSettings as EventListener,
      );
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
    window.addEventListener(
      "claim_cooldown_updated",
      onCustom as EventListener,
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "claim_cooldown_updated",
        onCustom as EventListener,
      );
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

      // Fetch queued lines specifically (queue endpoint)
      let queued: QueuedLine[] = [];
      try {
        const qRes = await fetch(`${window.location.origin}/api/numbers/queued`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          queued = Array.isArray(qData.lines) ? qData.lines : [];
        } else {
          console.warn("Queued endpoint returned non-ok status", qRes.status);
        }
      } catch (e) {
        console.warn("Failed to fetch queued endpoint, will fallback to lines endpoint", e);
      }

      // Fallback: try to fetch all lines and filter queued
      if (queued.length === 0) {
        try {
          const allRes = await fetch(`${window.location.origin}/api/numbers/lines`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (allRes.ok) {
            const allData = await allRes.json();
            const allLines = Array.isArray(allData.lines) ? allData.lines : [];
            queued = allLines.filter((line: any) => line.status === "queued");
          }
        } catch (e) {
          console.warn("Fallback fetch to /api/numbers/lines failed", e);
        }
      }

      setQueuedLines(queued);

      // Fetch claimed/distributed lines via claimed-lines endpoint
      try {
        const cRes = await fetch(`${window.location.origin}/api/numbers/claimed-lines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          const allClaimed = Array.isArray(cData.lines) ? cData.lines : [];
          const claimed = allClaimed.filter((line: ClaimItem) => line.status === "claimed");
          setClaims(claimed);
        } else {
          console.warn("claimed-lines endpoint returned non-ok", cRes.status);
        }
      } catch (e) {
        console.warn("Failed to fetch claimed-lines", e);
      }

      // also refresh distributor assignments
      fetchDistributorAssignments();
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
        const moveResponse = await fetch(`${window.location.origin}/api/numbers/move-to-distributor`, {
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
      const claimResponse = await fetch(`${window.location.origin}/api/numbers/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineId: lineToClaimId }),
      });

      if (!claimResponse.ok) {
        if (claimResponse.status === 409) {
          // Try to parse error message for better UX
          try {
            const err = await claimResponse.json();
            const message =
              err?.error || "Another member just claimed that line. Try again.";
            toast.error(message);
          } catch (e) {
            toast.error("Another member just claimed that line. Try again.");
          }
          await fetchData();
          return;
        }
        throw new Error("Failed to claim line");
      }

      // Parse response to show how many lines were claimed (backend may return { lines: [...] })
      let claimedCount = 1;
      try {
        const data = await claimResponse.json();
        if (Array.isArray(data.lines)) claimedCount = data.lines.length;
      } catch (e) {
        // ignore parse errors and default to 1
      }

      // Refetch data
      await fetchData();

      // start persistent cooldown using server setting (fallback 60s)
      startCooldown(claimSettingCooldown ?? 60);

      toast.success(
        `${claimedCount} line${claimedCount > 1 ? "s" : ""} claimed successfully!`,
      );
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
        <Tabs value={tab} onValueChange={(v) => {
            const nv = (v as any) as "claims" | "distributor";
            setTab(nv);
            if (nv === "distributor") markDistributorRead();
          }} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="claims">Numbers Claim</TabsTrigger>
            <TabsTrigger value="distributor">
              <span className="relative inline-flex items-center gap-2">
                Auto Distributor
                {unreadDistributor > 0 && (
                  <Badge variant="destructive" className="animate-pulse">{unreadDistributor}</Badge>
                )}
              </span>
            </TabsTrigger>
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
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 whitespace-pre-wrap break-words">
                            {claim.content}
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
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Auto Distributor Assignments</CardTitle>
                {distributorItems.length > 0 && (
                  <div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Clear</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Clear distributor assignments?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all Auto Distributor assigned lines for your team. This action cannot be undone.
                        </AlertDialogDescription>
                        <div className="flex gap-4 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                const res = await fetch(`${window.location.origin}/api/numbers/clear-distributor`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (!res.ok) throw new Error('Failed to clear distributor assignments');
                                await fetchDistributorAssignments();
                                toast.success('Distributor assignments cleared');
                              } catch (e) {
                                console.error('Clear distributor failed', e);
                                toast.error('Failed to clear distributor assignments');
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Clear
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
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
                            <span className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                              {line}
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
