import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QueuedLine {
  _id?: string;
  id?: string;
  content: string;
  lineNumber: number;
  createdAt?: string;
  claimedBy?: string;
  claimedAt?: string;
  status?: string;
}

export default function QueuedList() {
  const { token } = useAuth();
  const [lines, setLines] = useState<QueuedLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQueuedLines();
  }, [token]);

  const fetchQueuedLines = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/numbers/queued", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch queued lines");
      const data = await response.json();
      setLines(data.lines);
    } catch (error) {
      console.error("Error fetching queued lines:", error);
      toast.error("Failed to fetch queued lines");
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

  const handleClearAll = async () => {
    try {
      // Delete all lines
      const deletePromises = lines.map((line) =>
        fetch(`/api/numbers/line/${line._id || line.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      await Promise.all(deletePromises);
      setLines([]);
      toast.success("All queued lines cleared");
    } catch (error) {
      console.error("Error clearing lines:", error);
      toast.error("Failed to clear lines");
    }
  };

  const truncateText = (text: string, maxWords: number = 20) => {
    const words = text.split(" ");
    return words.length > maxWords
      ? words.slice(0, maxWords).join(" ") + "..."
      : text;
  };

  const unclaimedCount = lines.filter((l) => !l.claimedBy).length;
  const claimedCount = lines.filter((l) => l.claimedBy).length;

  if (isLoading) {
    return (
      <Layout title="Queued List">
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Queued List">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {lines.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Total Lines
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {unclaimedCount}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Unclaimed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {claimedCount}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Claimed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lines List */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <CardTitle>Queued Lines</CardTitle>
            {lines.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Clear all queued lines?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All queued lines will be
                    permanently deleted.
                  </AlertDialogDescription>
                  <div className="flex gap-4 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Clear All
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            {lines.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No queued lines
                </p>
              </div>
            ) : (
              lines.map((line) => (
                <div
                  key={line._id || line.id || `line-${line.lineNumber}`}
                  className={`p-4 rounded-lg border transition-all ${
                    line.claimedBy
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  } group`}
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

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {line.createdAt}
                        </span>
                        {line.claimedBy && (
                          <span className="text-green-600 dark:text-green-400">
                            ✓ Claimed by {line.claimedBy} ({line.claimedAt})
                          </span>
                        )}
                      </div>
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
