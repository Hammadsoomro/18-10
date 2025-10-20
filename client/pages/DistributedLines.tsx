import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DistributedLine {
  _id?: string;
  id?: string;
  content: string;
  lineNumber: number;
  createdAt?: string;
  claimedBy?: string;
  claimedByName?: string;
  claimedByUser?: {
    name: string;
    email: string;
  };
  claimedAt?: string;
  distributedTo?: string[];
  status?: string;
}

export default function DistributedLines() {
  const { token } = useAuth();
  const [lines, setLines] = useState<DistributedLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDistributedLines();
  }, [token]);

  const fetchDistributedLines = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/numbers/lines", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch distributed lines");
      const data = await response.json();

      // Show only lines with "distributed" status
      const distributedLines = data.lines.filter(
        (line: any) => line.status === "distributed",
      );
      setLines(distributedLines);
    } catch (error) {
      console.error("Error fetching distributed lines:", error);
      toast.error("Failed to fetch distributed lines");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLine = async (id: string) => {
    try {
      const response = await fetch(`/api/numbers/line/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete line");

      setLines(lines.filter((l) => l._id !== id && l.id !== id));
      toast.success("Line removed");
    } catch (error) {
      console.error("Error deleting line:", error);
      toast.error("Failed to delete line");
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
      <Layout title="Distributed Lines">
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Distributed Lines">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {lines.length}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Lines in Distribution
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lines List */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Lines Being Distributed</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {lines.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No distributed lines yet
                </p>
              </div>
            ) : (
              lines.map((line) => (
                <div
                  key={line._id || line.id}
                  className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
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
                      {line.claimedByName && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Claimed by {line.claimedByName} ({line.claimedAt})
                        </p>
                      )}
                      {line.distributedTo && line.distributedTo.length > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Distributed to {line.distributedTo.length} member(s)
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        handleDeleteLine(line._id || line.id || "")
                      }
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 dark:hover:bg-red-950 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
