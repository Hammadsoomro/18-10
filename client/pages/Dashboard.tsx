import { Layout } from "@/components/Layout/Layout";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [claimReady, setClaimReady] = useState(true);
  const [distributorActive, setDistributorActive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const socket = useSocket();
  const [stats, setStats] = useState({
    totalNumbers: 0,
    queuedLines: 0,
    activeMembers: 0,
    claimedToday: 0,
  });

  useEffect(() => {
    let mounted = true;
    let interval: number | undefined;

    const fetchStats = async () => {
      try {
        if (!token) return;
        const res = await fetch(`/api/numbers/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        if (!mounted) return;
        setStats({
          totalNumbers: data.totalNumbers || 0,
          queuedLines: data.queuedLines || 0,
          activeMembers: data.activeMembers || 0,
          claimedToday: data.claimedToday || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    const fetchDistributorActive = async () => {
      try {
        if (!token) return;
        const res = await fetch(`/api/auth/distributor-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setDistributorActive(Boolean(data.isActive));
      } catch (e) {
        console.error("Failed to fetch distributor settings", e);
      }
    };

    fetchStats();
    fetchDistributorActive();

    // socket for real-time distributor indicator & stats
    try {
      const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
      const teamId = payload?.teamId;

      if (socket) {
        socketRef.current = socket;

        const onConnect = () => {
          if (teamId) socket.emit("join_team", teamId);
        };

        const onDistributorIndicator = (data: any) => {
          if (typeof data?.active === "boolean")
            setDistributorActive(Boolean(data.active));
        };

        const onStatsUpdated = () => fetchStats();
        const onQueuedChanged = () => fetchStats();

        socket.on("connect", onConnect);
        socket.on("distributor_indicator", onDistributorIndicator);
        socket.on("stats_updated", onStatsUpdated);
        socket.on("queued_lines_changed", onQueuedChanged);

        // store ref for cleanup
        socketRef.current = socket;

        // cleanup function will remove listeners
        return () => {
          socket.off("connect", onConnect);
          socket.off("distributor_indicator", onDistributorIndicator);
          socket.off("stats_updated", onStatsUpdated);
          socket.off("queued_lines_changed", onQueuedChanged);
        };
      }
    } catch (e) {
      console.error("Dashboard socket init error", e);
    }

    // stop polling; rely on socket events for updates

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, [token, socket]);

  return (
    <Layout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-blue-100">
            {user?.role === "admin"
              ? "Manage your team and distribution settings"
              : "View your claims and assigned numbers"}
          </p>
        </div>

        {/* Real-time indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Claim Status */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Claim Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Current Status
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {claimReady ? "Ready" : "Cooldown"}
                  </p>
                </div>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    claimReady
                      ? "bg-green-100 dark:bg-green-950"
                      : "bg-red-100 dark:bg-red-950"
                  }`}
                >
                  {claimReady ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distributor Status */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto Distributor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Status
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      distributorActive
                        ? "text-cyan-600 dark:text-cyan-400"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {distributorActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    distributorActive
                      ? "bg-cyan-100 dark:bg-cyan-950"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {distributorActive ? (
                    <Activity className="h-8 w-8 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                  ) : (
                    <Activity className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Numbers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.totalNumbers}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                All time
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Queued Lines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {stats.queuedLines}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Ready to claim
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.activeMembers}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                In your team
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Claimed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.claimedToday}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Numbers claimed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/numbers-sorter")}
                className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-left"
              >
                <div className="font-semibold text-blue-900 dark:text-blue-400">
                  Add Numbers
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Input and queue new numbers
                </p>
              </button>

              <button
                onClick={() => navigate("/inbox")}
                className="p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-950/50 transition-colors text-left"
              >
                <div className="font-semibold text-cyan-900 dark:text-cyan-400">
                  View Inbox
                </div>
                <p className="text-sm text-cyan-700 dark:text-cyan-300">
                  Check claims and distributions
                </p>
              </button>

              <button
                onClick={() => navigate("/settings")}
                className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors text-left"
              >
                <div className="font-semibold text-green-900 dark:text-green-400">
                  Team Settings
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Manage members and settings
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
