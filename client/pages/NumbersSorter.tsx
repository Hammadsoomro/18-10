import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/useSocket";

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
  const [duplicates, setDuplicates] = useState<NumberLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // real-time socket
  useSocket(user?.teamId, {
    lines_added: (payload: any) => {
      if (!payload || !Array.isArray(payload.lines)) return;
      setLines((prev) => {
        const combined = [...payload.lines, ...prev];
        const seen = new Set();
        return combined.filter((l: any) => {
          const id = l._id || l.id;
          if (!id) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });
    },
    duplicates_added: (payload: any) => {
      if (!payload || !Array.isArray(payload.duplicates)) return;
      setDuplicates((prev) => {
        const combined = [...payload.duplicates, ...prev];
        const seen = new Set();
        return combined.filter((d: any) => {
          const id = d._id || d.id;
          if (!id) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });
    },
    lines_moved_to_queue: () => {
      fetchLines(true);
    },
    lines_moved_to_distributor: () => {
      fetchLines(true);
    },
    line_deleted: (p: any) => {
      const id = p?.id;
      if (!id) return;
      setLines((prev) => prev.filter((l) => (l._id || l.id) !== id));
      setDuplicates((prev) => prev.filter((d) => (d._id || d.id) !== id));
    },
    distributor_cleared: () => fetchLines(),
    distributed_lines: () => fetchLines(),
    distributor_indicator: () => fetchLines(),
    claim_indicator: () => fetchLines(),
  });

  useEffect(() => {
    fetchLines();

    const onLinesUpdated = () => {
      fetchLines();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "lines_updated") fetchLines();
    };

    window.addEventListener("lines_updated", onLinesUpdated as EventListener);
    window.addEventListener("storage", onStorage);

    // setup socket real-time updates
    let unsub: (() => void) | null = null;
    try {
      // lazy-import to avoid SSR issues
      const { useSocket: _useSocket } = require("@/hooks/useSocket");
    } catch (e) {
      // ignore
    }

    const interval = setInterval(() => fetchLines(), 15000); // poll fallback every 15s

    return () => {
      window.removeEventListener("lines_updated", onLinesUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
      if (unsub) unsub();
    };
  }, [token]);

  const fetchLines = async (silent = false) => {
    if (!token) {
      if (!silent) setIsLoading(false);
      return;
    }

    try {
      if (!silent) setIsLoading(true);
      const response = await fetch(`${window.location.origin}/api/numbers/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch lines");
      const data = await response.json();

      // For admin Numbers Sorter, show lines in the 'staged' status (Sorted Lines live)
      const all = Array.isArray(data.lines) ? data.lines : [];
      const stagedLines = all.filter((line: any) => line.status === "staged");
      const duplicateLines = all.filter((line: any) => line.status === "duplicate");
      setLines(stagedLines);
      setDuplicates(duplicateLines);
    } catch (error) {
      console.error("Error fetching lines:", error);
      if (!silent) toast.error("Failed to fetch lines");
    } finally {
      if (!silent) setIsLoading(false);
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

    // Check for duplicates with existing staged lines and distributed lines
    const existingContents = new Set(lines.map((l) => (l.content || "").toString().trim().toLowerCase()));

    try {
      // Fetch distributed (claimed-lines) and queued lines in parallel to dedupe against both
      const [distRes, queuedRes] = await Promise.all([
        fetch(`${window.location.origin}/api/numbers/claimed-lines`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${window.location.origin}/api/numbers/queued`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (distRes && distRes.ok) {
        const distData = await distRes.json();
        const distributed = Array.isArray(distData.lines)
          ? distData.lines.filter((ln: any) => ln.status === "distributed")
          : [];
        for (const d of distributed) {
          if (d && d.content)
            existingContents.add((d.content || "").toString().trim().toLowerCase());
        }
      }

      if (queuedRes && queuedRes.ok) {
        const queuedData = await queuedRes.json();
        const queuedExisting = Array.isArray(queuedData.lines) ? queuedData.lines : [];
        for (const q of queuedExisting) {
          if (q && q.content)
            existingContents.add((q.content || "").toString().trim().toLowerCase());
        }
      }
    } catch (e) {
      console.warn("Failed to fetch distributed/queued lines for dedupe", e);
    }

    const beforeDedup = lineTexts.length;
    lineTexts = lineTexts.filter((text) => !existingContents.has(text.toString().trim().toLowerCase()));
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
      const response = await fetch(`${window.location.origin}/api/numbers/lines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contents: lineTexts }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        let message = `Failed to add lines: ${response.status}`;
        try {
          const json = JSON.parse(body || "{}");
          if (json && json.error) message = json.error;
        } catch {}
        console.error("Add lines failed:", response.status, body);
        toast.error(message);
        setIsAdding(false);
        return;
      }

      const data = await response.json();

      // If server returned duplicate records, merge them into duplicates state immediately so UI updates without waiting for fetchLines
      try {
        if (data && Array.isArray(data.duplicates) && data.duplicates.length > 0) {
          setDuplicates((prev) => {
            // prepend new duplicates and dedupe by id
            const combined = [...data.duplicates, ...prev];
            const seen = new Set();
            return combined.filter((d: any) => {
              const id = d._id || d.id;
              if (!id) return true;
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
          });
        }
      } catch (e) {
        console.warn('Failed to merge server duplicates', e);
      }

      // Refresh lines from server to ensure UI reflects server-side state
      await fetchLines();
      try {
        localStorage.setItem("lines_updated", String(Date.now()));
        window.dispatchEvent(new CustomEvent("lines_updated"));
      } catch (e) {}
      setInputValue("");

      let message = `${lineTexts.length} line${lineTexts.length > 1 ? "s" : ""} added`;
      const totalRemoved = duplicatesInInput + duplicatesWithExisting + (Array.isArray(data.duplicates) ? data.duplicates.length : 0);
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
      const response = await fetch(`${window.location.origin}/api/numbers/line/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete line");

      setLines(lines.filter((l) => l._id !== id && l.id !== id));
      try {
        localStorage.setItem("lines_updated", String(Date.now()));
        window.dispatchEvent(new CustomEvent("lines_updated"));
      } catch (e) {}
      toast.success("Line deleted");
    } catch (error) {
      console.error("Error deleting line:", error);
      toast.error("Failed to delete line");
    }
  };

  const handleDeleteDuplicate = async (id: string) => {
    try {
      const response = await fetch(`${window.location.origin}/api/numbers/line/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete duplicate");

      setDuplicates(duplicates.filter((d) => d._id !== id && d.id !== id));
      try {
        localStorage.setItem("lines_updated", String(Date.now()));
        window.dispatchEvent(new CustomEvent("lines_updated"));
      } catch (e) {}
      toast.success("Duplicate removed");
    } catch (error) {
      console.error("Error deleting duplicate:", error);
      toast.error("Failed to delete duplicate");
    }
  };

  const handleMoveToQueuedList = async () => {
    if (lines.length === 0) {
      toast.error("No lines to move");
      return;
    }

    setIsMoving(true);
    try {
      // Fetch all lines to determine which are already distributed
      const allRes = await fetch(`${window.location.origin}/api/numbers/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!allRes.ok) throw new Error("Failed to fetch existing lines");
      const allData = await allRes.json();
      const allLines = Array.isArray(allData.lines) ? allData.lines : [];

      // Build a set of distributed contents to dedupe against
      const distributedContents = new Set(
        allLines
          .filter((l: any) => l.status === "distributed")
          .map((l: any) => (typeof l.content === "string" ? l.content.trim() : String(l.content)))
      );

      // Filter current sorter lines to exclude any that already exist in distributed
      const linesToMove = lines.filter(
        (l) => !distributedContents.has((l.content || "").trim()),
      );

      if (linesToMove.length === 0) {
        toast.error("All selected lines already exist in Distributed Lines and were skipped");
        setIsMoving(false);
        return;
      }

      const lineIds = linesToMove.map((l) => l._id || l.id).filter(Boolean);
      const response = await fetch(`${window.location.origin}/api/numbers/move-to-queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineIds }),
      });

      if (!response.ok) throw new Error("Failed to move lines");

      toast.success(`${linesToMove.length} line(s) moved to Queued List`);
      try {
        localStorage.setItem("lines_updated", String(Date.now()));
        window.dispatchEvent(new CustomEvent("lines_updated"));
      } catch (e) {}
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
      const response = await fetch(`${window.location.origin}/api/numbers/move-to-distributor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineIds }),
      });

      if (!response.ok) throw new Error("Failed to move lines");

      toast.success(`${lines.length} line(s) moved to Auto Distributor`);
      // notify other pages to refresh distributed lines and general lines
      try {
        localStorage.setItem("distributor_updated", String(Date.now()));
        window.dispatchEvent(
          new CustomEvent("distributor_updated", {
            detail: { teamId: user?.teamId },
          }),
        );
        localStorage.setItem("lines_updated", String(Date.now()));
        window.dispatchEvent(new CustomEvent("lines_updated"));
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
                          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words">
                            {line.content}
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

        {/* Duplicates Removed Block - hidden when empty */}
        {duplicates.length > 0 && (
          <div className="mt-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Removed Duplicates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {duplicates.map((d) => (
                  <div key={d._id || d.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-start justify-between gap-4">
                    <div className="flex-1 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">
                      {d.content}
                    </div>
                    <div className="ml-4">
                      <button onClick={() => handleDeleteDuplicate(d._id || d.id || "")} className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
