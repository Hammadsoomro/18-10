import { useState, useEffect } from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { token, user } = useAuth();
  const [lines, setLines] = useState<DistributedLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const filteredLines = lines.filter((line) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const content = (line.content || "").toLowerCase();
    const claimedByName = (
      (line as any).claimedBy?.name ||
      line.claimedByName ||
      ""
    ).toLowerCase();
    const lineNum = String(line.lineNumber || "");
    return (
      content.includes(q) || claimedByName.includes(q) || lineNum.includes(q)
    );
  });

  const socket = useSocket();

  useEffect(() => {
    fetchDistributedLines();

    if (socket) {
      socket.on("distributed_lines", () => fetchDistributedLines());
      socket.on("queued_lines_changed", () => fetchDistributedLines());
      socket.on("sorted_lines_changed", () => fetchDistributedLines());
    }

    return () => {
      if (socket) {
        socket.off("distributed_lines", () => fetchDistributedLines());
        socket.off("queued_lines_changed", () => fetchDistributedLines());
        socket.off("sorted_lines_changed", () => fetchDistributedLines());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, socket]);

  const fetchDistributedLines = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/numbers/claimed-lines", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch claimed lines");
      const data = await response.json();

      setLines(data.lines || []);
    } catch (error) {
      console.error("Error fetching claimed lines:", error);
      toast.error("Failed to fetch claimed lines");
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

      if (!response.ok) {
        let body = await response.text();
        try {
          const json = JSON.parse(body);
          toast.error(json.error || "Failed to delete line");
        } catch (e) {
          toast.error(`Failed to delete line: ${response.status}`);
        }
        throw new Error(`Failed to delete line: ${response.status}`);
      }

      setLines(lines.filter((l) => l._id !== id && l.id !== id));
      toast.success("Line removed");
    } catch (error) {
      console.error("Error deleting line:", error);
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
          <CardHeader className="flex items-center justify-between gap-4">
            <CardTitle>Lines Being Distributed</CardTitle>
            <div className="w-72">
              <Input
                placeholder="Search by content, claimant, or line #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {lines.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No distributed lines yet
                </p>
              </div>
            ) : filteredLines.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">
                  No results for "{search}"
                </p>
              </div>
            ) : (
              filteredLines.map((line) => (
                <div
                  key={line._id || line.id}
                  className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                        {truncateText(line.content)}
                      </p>
                      {user?.role === "admin" && (
                        <div>
                          {(line as any).claimedBy && (
                            <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                              ✓ Claimed by {(line as any).claimedBy.name}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(line.claimedAt || line.createdAt)}
                          </p>
                        </div>
                      )}
                      {user?.role === "member" && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {line.claimedAt || line.createdAt}
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
