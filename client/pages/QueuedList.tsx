import { useState } from "react";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface QueuedLine {
  id: string;
  content: string;
  lineNumber: number;
  createdAt: string;
  claimedBy?: string;
  claimedAt?: string;
}

export default function QueuedList() {
  const [lines, setLines] = useState<QueuedLine[]>([
    {
      id: "1",
      content: "John Doe - Sales - Premium Package",
      lineNumber: 1,
      createdAt: "2024-01-15 10:30 AM",
    },
    {
      id: "2",
      content: "Jane Smith - Support - Billing Inquiry",
      lineNumber: 2,
      createdAt: "2024-01-15 10:35 AM",
    },
    {
      id: "3",
      content: "Mike Johnson - Sales - Quote Request",
      lineNumber: 3,
      createdAt: "2024-01-15 10:40 AM",
    },
    {
      id: "4",
      content: "Sarah Williams - Partnership - New Opportunity",
      lineNumber: 4,
      createdAt: "2024-01-15 10:45 AM",
      claimedBy: "John Doe",
      claimedAt: "2024-01-15 11:00 AM",
    },
    {
      id: "5",
      content: "Tom Anderson - Support - Technical Issue",
      lineNumber: 5,
      createdAt: "2024-01-15 10:50 AM",
    },
  ]);

  const handleDeleteLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
    toast.success("Line removed");
  };

  const handleClearAll = () => {
    setLines([]);
    toast.success("All queued lines cleared");
  };

  const truncateText = (text: string, maxWords: number = 20) => {
    const words = text.split(" ");
    return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "..." : text;
  };

  const unclaimedCount = lines.filter((l) => !l.claimedBy).length;
  const claimedCount = lines.filter((l) => l.claimedBy).length;

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
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Total Lines</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {unclaimedCount}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Unclaimed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {claimedCount}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Claimed</p>
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
                    This action cannot be undone. All queued lines will be permanently deleted.
                  </AlertDialogDescription>
                  <div className="flex gap-4 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
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
                <p className="text-slate-600 dark:text-slate-400">No queued lines</p>
              </div>
            ) : (
              lines.map((line) => (
                <div
                  key={line.id}
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
                      onClick={() => handleDeleteLine(line.id)}
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
