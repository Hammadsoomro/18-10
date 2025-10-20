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
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [linesPerMember, setLinesPerMember] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["1"]);
  const [distributedLines, setDistributedLines] = useState<DistributedLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [members] = useState<TeamMember[]>([
    { id: "1", name: "John Doe", email: "john@example.com", active: true },
    { id: "2", name: "Jane Smith", email: "jane@example.com", active: true },
    { id: "3", name: "Mike Johnson", email: "mike@example.com", active: false },
    {
      id: "4",
      name: "Sarah Williams",
      email: "sarah@example.com",
      active: true,
    },
  ]);

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
      const distributed = data.lines.filter(
        (line: any) => line.status === "distributed"
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

  const handleSave = () => {
    if (selectedMembers.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    toast.success("Settings saved");
  };

  const handleToggleDistributor = () => {
    if (!isActive && selectedMembers.length === 0) {
      toast.error("Select members first");
      return;
    }
    setIsActive(!isActive);
    toast.success(isActive ? "Distributor stopped" : "Distributor started");
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
      </div>
    </Layout>
  );
}
