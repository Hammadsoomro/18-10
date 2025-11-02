import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NumberLine {
  _id?: string;
  id?: string;
  content: string;
  lineNumber: number;
  createdAt?: string;
  status?: string;
}

export default function NumbersSorter() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [lines, setLines] = useState<NumberLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const socket = useSocket();

  useEffect(() => {
    fetchLines();

    if (socket) {
      socket.on('sorted_lines_changed', () => fetchLines());
      socket.on('queued_lines_changed', () => fetchLines());
      socket.on('stats_updated', () => fetchLines());
    }

    return () => {
      if (socket) {
        socket.off('sorted_lines_changed', () => fetchLines());
        socket.off('queued_lines_changed', () => fetchLines());
        socket.off('stats_updated', () => fetchLines());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, socket]);

  const fetchLines = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/numbers/lines?status=sorted", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch lines");
      const data = await response.json();

      // show only 'sorted' status lines
      const sortedLines = (data.lines || []).filter((line: any) => line.status === "sorted");
      setLines(sortedLines);
    } catch (error) {
      console.error("Error fetching lines:", error);
      toast.error("Failed to fetch lines");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLine = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter some content");
      return;
    }

    let lineTexts = inputValue
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lineTexts.length === 0) {
      toast.error("Please enter some content");
      return;
    }

    // Deduplicate lines within input
    const duplicatesInInput = lineTexts.length - new Set(lineTexts).size;
    lineTexts = Array.from(new Set(lineTexts));

    // Check for duplicates with existing lines
    const existingContents = new Set(lines.map((l) => l.content));
    const beforeDedup = lineTexts.length;
    lineTexts = lineTexts.filter((text) => !existingContents.has(text));
    const duplicatesWithExisting = beforeDedup - lineTexts.length;

    if (lineTexts.length === 0) {
      if (duplicatesInInput > 0 || duplicatesWithExisting > 0) {
        toast.error("All lines are duplicates");
      } else {
        toast.error("Please enter some content");
      }
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/numbers/lines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents: lineTexts }),
      });

      if (!response.ok) throw new Error("Failed to add lines");
      const data = await response.json();

      setLines([...lines, ...data.lines]);
      setInputValue("");

      let message = `${lineTexts.length} line${lineTexts.length > 1 ? "s" : ""} added`;
      const totalRemoved = duplicatesInInput + duplicatesWithExisting;
      if (totalRemoved > 0) {
        message += ` (${totalRemoved} duplicate${totalRemoved > 1 ? "s" : ""} removed)`;
      }
      toast.success(message);
    } catch (error) {
      console.error("Error adding lines:", error);
      toast.error("Failed to add lines");
    } finally {
      setIsAdding(false);
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
      toast.success("Line deleted");
    } catch (error) {
      console.error("Error deleting line:", error);
      toast.error("Failed to delete line");
    }
  };

  const handleMoveToQueuedList = async () => {
    if (lines.length === 0) {
      toast.error("No lines to move");
      return;
    }

    setIsMoving(true);
    try {
      const lineIds = lines.map((l) => l._id || l.id).filter(Boolean);
      const response = await fetch("/api/numbers/move-to-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineIds }),
      });

      if (!response.ok) throw new Error("Failed to move lines");

      toast.success(`${lines.length} line(s) moved to Queued List`);
      setLines([]);
      setTimeout(() => navigate("/queued-list"), 500);
    } catch (error) {
      console.error("Error moving lines:", error);
      toast.error("Failed to move lines");
    } finally {
      setIsMoving(false);
    }
  };

  const handleMoveToAutoDistributor = async () => {
    if (lines.length === 0) {
      toast.error("No lines to move");
      return;
    }

    setIsMoving(true);
    try {
      const lineIds = lines.map((l) => l._id || l.id).filter(Boolean);
      const response = await fetch("/api/numbers/move-to-distributor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineIds }),
      });

      if (!response.ok) throw new Error("Failed to move lines");

      toast.success(`${lines.length} line(s) moved to Auto Distributor`);
      // notify other pages to refresh distributed lines
      try {
        localStorage.setItem("distributor_updated", String(Date.now()));
        window.dispatchEvent(
          new CustomEvent("distributor_updated", {
            detail: { teamId: user?.teamId },
          }),
        );
      } catch (e) {}
      setLines([]);
      setTimeout(() => navigate("/auto-distributor"), 500);
    } catch (error) {
      console.error("Error moving lines:", error);
      toast.error("Failed to move lines");
    } finally {
      setIsMoving(false);
    }
  };

  const truncateText = (text: string, maxWords: number = 15) => {
    const words = text.split(" ");
    return words.length > maxWords
      ? words.slice(0, maxWords).join(" ") + "..."
      : text;
  };

  if (isLoading) {
    return (
      <Layout title="Numbers Sorter">
        <div className="p-6 flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  // Hide page UI for non-admin users
  if (user && user.role !== "admin") {
    return (
      <Layout title="Numbers Sorter">
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
    <Layout title="Numbers Sorter">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="border-slate-200 dark:border-slate-800 h-fit">
            <CardHeader>
              <CardTitle>Input Numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Add new line
                </label>
                <Textarea
                  placeholder="Enter contact details or number information..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleAddLine}
                disabled={isAdding}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </>
                )}
              </Button>

              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <strong>{lines.length}</strong> lines in sorter
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sorted Lines (Live)</CardTitle>
              <span className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                {lines.length} lines
              </span>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {lines.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No lines added yet
                </p>
              ) : (
                lines.map((line) => (
                  <div
                    key={line._id || line.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {truncateText(line.content)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {line.createdAt}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteLine(line._id || line.id || "")
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-950 rounded"
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

        {/* Action Buttons */}
        {lines.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={isMoving}
              onClick={handleMoveToQueuedList}
            >
              {isMoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Add to Queued List"
              )}
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isMoving}
              onClick={handleMoveToAutoDistributor}
            >
              {isMoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Add to Auto Distributor"
              )}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
