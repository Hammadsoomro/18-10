import { useState } from "react";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Clock, Download } from "lucide-react";
import { toast } from "sonner";

interface ClaimItem {
  id: string;
  lineNumber: number;
  content: string;
  claimedAt: string;
  status: "ready" | "cooldown" | "no_available";
}

interface DistributorItem {
  id: string;
  lines: string[];
  assignedTo: string;
  distributedAt: string;
}

export default function Inbox() {
  const [claimCooldown, setClaimCooldown] = useState(0);
  const [claims, setClaims] = useState<ClaimItem[]>([
    {
      id: "1",
      lineNumber: 1,
      content: "John Doe - Sales - Premium Package",
      claimedAt: "2024-01-15 11:00 AM",
      status: "ready",
    },
    {
      id: "2",
      lineNumber: 2,
      content: "Jane Smith - Support - Billing Inquiry",
      claimedAt: "2024-01-15 11:05 AM",
      status: "ready",
    },
    {
      id: "3",
      lineNumber: 3,
      content: "Mike Johnson - Sales - Quote Request",
      claimedAt: "2024-01-15 10:30 AM",
      status: "cooldown",
    },
  ]);

  const [distributorItems, setDistributorItems] = useState<DistributorItem[]>([
    {
      id: "1",
      lines: [
        "Sarah Williams - Partnership",
        "Tom Anderson - Support",
        "Lisa Davis - Sales",
        "Robert Brown - Support",
        "Emma Wilson - Sales",
      ],
      assignedTo: "Team A",
      distributedAt: "2024-01-15 10:45 AM",
    },
    {
      id: "2",
      lines: [
        "Chris Martin - Sales",
        "Diana Prince - Partnership",
        "Edward Norton - Support",
      ],
      assignedTo: "Team B",
      distributedAt: "2024-01-15 10:50 AM",
    },
  ]);

  const handleClaim = () => {
    if (claimCooldown > 0) {
      toast.error("Still in cooldown");
      return;
    }
    setClaimCooldown(60);
    const timer = setInterval(() => {
      setClaimCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    toast.success("Line claimed!");
  };

  const getClaimButtonColor = () => {
    if (claimCooldown > 0) return "bg-red-600 hover:bg-red-700";
    if (claims.length === 0) return "bg-slate-400 cursor-not-allowed";
    return "bg-green-600 hover:bg-green-700";
  };

  const getClaimButtonText = () => {
    if (claimCooldown > 0) return `Cooldown: ${claimCooldown}s`;
    if (claims.length === 0) return "No Lines Available";
    return "Claim Next Line";
  };

  const truncateText = (text: string, maxWords: number = 10) => {
    const words = text.split(" ");
    return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "..." : text;
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
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                    claimCooldown > 0
                      ? "bg-red-200 dark:bg-red-900"
                      : "bg-green-200 dark:bg-green-900"
                  }`}>
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
                      {claims.length} line(s) available
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleClaim}
                  disabled={claims.length === 0 || claimCooldown > 0}
                  className={`w-full text-white font-semibold py-6 ${getClaimButtonColor()}`}
                >
                  {getClaimButtonText()}
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
                  claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              #{claim.lineNumber}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {truncateText(claim.content)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                            {claim.claimedAt}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          claim.status === "ready"
                            ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400"
                            : claim.status === "cooldown"
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}>
                          {claim.status === "ready" ? "🟢 Ready" : claim.status === "cooldown" ? "🔴 Cooldown" : "⚪️ No Available"}
                        </span>
                      </div>
                    </div>
                  ))
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
                          <div key={idx} className="text-sm flex items-start gap-2">
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
