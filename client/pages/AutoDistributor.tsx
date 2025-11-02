import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Users, Loader2, AlertCircle } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

interface DistributedLine {
  _id?: string;
  id?: string;
  content: string;
  lineNumber: number;
  createdAt?: string;
  distributedTo?: string[];
}

export default function AutoDistributor() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [linesPerMember, setLinesPerMember] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [distributedLines, setDistributedLines] = useState<DistributedLine[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const socket = useSocket();

  useEffect(() => {
    fetchMembers();
    fetchDistributorSettings();
    fetchDistributedLines();

    const onDistributorUpdated = () => {
      // small debounce to ensure server-side update committed
      setTimeout(() => fetchDistributedLines(), 300);
    };

    window.addEventListener(
      "distributor_updated",
      onDistributorUpdated as EventListener,
    );
    const onStorage = (e: StorageEvent) => {
      if (e.key === "distributor_updated") {
        onDistributorUpdated();
      }
    };
    window.addEventListener("storage", onStorage);

    if (socket) {
      const onDistributed = (data: any) => {
        fetchDistributedLines();
        try {
          const count = Array.isArray(data.lines) ? data.lines.length : 0;
          if (count > 0) {
            import("sonner")
              .then(({ toast }) => toast.success(`${count} line(s) distributed`))
              .catch(() => {});
          }
        } catch (e) {}
      };

      const onDistributorIndicator = (data: any) => {
        // could update UI indicator if needed
      };

      const onQueuedChanged = () => fetchDistributedLines();
      const onSortedChanged = () => fetchDistributedLines();

      socket.on("distributed_lines", onDistributed);
      socket.on("distributor_indicator", onDistributorIndicator);
      socket.on("queued_lines_changed", onQueuedChanged);
      socket.on("sorted_lines_changed", onSortedChanged);

      return () => {
        window.removeEventListener(
          "distributor_updated",
          onDistributorUpdated as EventListener,
        );
        window.removeEventListener("storage", onStorage);
        socket.off("distributed_lines", onDistributed);
        socket.off("distributor_indicator", onDistributorIndicator);
        socket.off("queued_lines_changed", onQueuedChanged);
        socket.off("sorted_lines_changed", onSortedChanged);
      };
    }

    return () => {
      window.removeEventListener(
        "distributor_updated",
        onDistributorUpdated as EventListener,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, [token, socket]);

  const fetchMembers = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/auth/members", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      setMembers([]);
    }
  };

  const fetchDistributorSettings = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/auth/distributor-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch distributor settings");
      const data = await response.json();
      setLinesPerMember(data.linesPerMember);
      setTimerSeconds(data.timerSeconds);
      setIsActive(data.isActive);
      setSelectedMembers(data.selectedMembers.map((m: any) => m.id));
    } catch (error) {
      console.error("Error fetching distributor settings:", error);
    }
  };

  const fetchDistributedLines = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Use the claimed-lines endpoint which includes distributed items
      const response = await fetch("/api/numbers/claimed-lines", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch distributed lines");
      const data = await response.json();

      // Show only lines with "distributed" status (endpoint returns claimed + distributed)
      const distributed = data.lines.filter(
        (line: any) => line.status === "distributed",
      );
      setDistributedLines(distributed);
    } catch (error) {
      console.error("Error fetching distributed lines:", error);
      toast.error("Failed to fetch distributed lines");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Select at least one member");
      return;
    }

    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const response = await fetch("/api/auth/distributor-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          linesPerMember,
          timerSeconds,
          isActive,
          selectedMembers,
        }),
      });

      if (!response.ok) throw new Error("Failed to save distributor settings");

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving distributor settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleToggleDistributor = async () => {
    if (!isActive && selectedMembers.length === 0) {
      toast.error("Select members first");
      return;
    }

    const newIsActive = !isActive;
    setIsActive(newIsActive);

    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const response = await fetch("/api/auth/distributor-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          linesPerMember,
          timerSeconds,
          isActive: newIsActive,
          selectedMembers,
        }),
      });

      if (!response.ok) throw new Error("Failed to update distributor status");

      toast.success(
        newIsActive ? "Distributor started" : "Distributor stopped",
      );
    } catch (error) {
      console.error("Error toggling distributor:", error);
      setIsActive(!newIsActive);
      toast.error("Failed to update distributor status");
    }
  };

  const truncateText = (text: string, maxWords: number = 20) => {
    const words = text.split(" ");
    return words.length > maxWords
      ? words.slice(0, maxWords).join(" ") + "..."
      : text;
  };

  if (isLoading) {
    return (
      <Layout title="Auto Distributor">
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  // Hide UI from non-admins
  if (user && user.role !== "admin") {
    return (
      <Layout title="Auto Distributor">
        <div className="p-6">
          <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
            <p className="text-lg font-semibold">Not available</p>
            <p className="text-sm text-slate-500 mt-2">
              This page is only visible to admins.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Auto Distributor">
      <div className="p-6 space-y-6">
        {/* Status Card */}
        <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isActive
                      ? "bg-purple-200 dark:bg-purple-900"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <Zap
                    className={`h-6 w-6 ${isActive ? "text-purple-600 animate-pulse" : "text-slate-600"}`}
                  />
                </div>
                <div>
                  <CardTitle>Auto Distributor Status</CardTitle>
                  <p
                    className={`text-sm ${isActive ? "text-purple-600" : "text-slate-600"}`}
                  >
                    {isActive ? "Active - Distributing" : "Inactive - Paused"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleDistributor}
              />
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lines per member */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">Lines Per Member</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Distribution size: {linesPerMember} lines</Label>
                    <span className="text-sm text-slate-500">1 - 15 lines</span>
                  </div>
                  <Slider
                    value={[linesPerMember]}
                    onValueChange={(value) => setLinesPerMember(value[0])}
                    min={1}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Timer */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">
                  Distribution Loop Timer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Loop interval: {timerSeconds} seconds</Label>
                    <span className="text-sm text-slate-500">
                      1 - 300 seconds
                    </span>
                  </div>
                  <Slider
                    value={[timerSeconds]}
                    onValueChange={(value) => setTimerSeconds(value[0])}
                    min={1}
                    max={300}
                    step={5}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <Button
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Save Settings
            </Button>
          </div>

          {/* Member Selection */}
          <Card className="border-slate-200 dark:border-slate-800 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Members
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {selectedMembers.length} of {members.length} selected
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={member.id}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => handleToggleMember(member.id)}
                  />
                  <label
                    htmlFor={member.id}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <div className="font-medium">{member.name}</div>
                    <div
                      className={`text-xs ${
                        member.active
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Distributed Lines Section */}
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Lines in Distribution
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {distributedLines.length} line(s) being distributed
            </p>
          </div>

          {distributedLines.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6 space-y-3">
                {distributedLines.slice(0, 5).map((line) => (
                  <div
                    key={line._id || line.id}
                    className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 dark:text-white">
                            #{line.lineNumber}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {truncateText(line.content)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {line.createdAt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {distributedLines.length > 5 && (
                  <Button
                    onClick={() => navigate("/distributed-lines")}
                    variant="outline"
                    className="w-full"
                  >
                    View all {distributedLines.length} distributed lines
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {distributedLines.length === 0 && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No lines in distribution yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                    Lines will appear here when you add them from Numbers Sorter
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
