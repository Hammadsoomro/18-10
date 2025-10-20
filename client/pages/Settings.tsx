import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Clock, Bell, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, token } = useAuth();
  const [claimLineCount, setClaimLineCount] = useState(1);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; email: string; active: boolean }[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (user?.role === "admin" && token) {
      fetchClaimSettings();
    }
  }, [user, token]);

  const fetchClaimSettings = async () => {
    if (!token) return;

    try {
      setIsLoadingSettings(true);
      const response = await fetch("/api/auth/claim-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch claim settings");

      const data = await response.json();
      setClaimLineCount(data.claimLineCount);
      setCooldownSeconds(data.cooldownSeconds);
    } catch (error) {
      console.error("Error fetching claim settings:", error);
      toast.error("Failed to load claim settings");
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveClaimSettings = async () => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    try {
      setIsSavingSettings(true);
      const response = await fetch("/api/auth/claim-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claimLineCount,
          cooldownSeconds,
        }),
      });

      if (!response.ok) throw new Error("Failed to save claim settings");

      toast.success("Claim settings saved successfully");
    } catch (error) {
      console.error("Error saving claim settings:", error);
      toast.error("Failed to save claim settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully");
  };

  const handleCreateMember = async () => {
    if (!memberName.trim()) {
      toast.error("Please enter member name");
      return;
    }

    if (!memberEmail.trim()) {
      toast.error("Please enter member email");
      return;
    }

    if (!memberPassword.trim()) {
      toast.error("Please enter password");
      return;
    }

    if (memberPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    setIsCreatingMember(true);
    try {
      const response = await fetch("/api/auth/create-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: memberName,
          email: memberEmail,
          password: memberPassword,
        }),
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.error || "Failed to create member");
        } catch (e) {
          const statusMessage = `${response.status}: ${response.statusText}`;
          throw new Error(statusMessage);
        }
      }

      const data = await response.json();
      toast.success(`Team member ${memberName} created successfully`);
      setIsDialogOpen(false);
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");
    } catch (error) {
      console.error("Error creating member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create member",
      );
    } finally {
      setIsCreatingMember(false);
    }
  };

  return (
    <Layout title="Settings">
      <div className="p-6 max-w-4xl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="claim">Claim</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      defaultValue={user?.name}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user?.email}
                      className="mt-2"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="role">Account Type</Label>
                  <Input
                    id="role"
                    defaultValue={
                      user?.role === "admin" ? "Admin" : "Team Member"
                    }
                    className="mt-2"
                    disabled
                  />
                </div>

                {user?.teamId && (
                  <div>
                    <Label htmlFor="teamId">Team ID</Label>
                    <Input
                      id="teamId"
                      defaultValue={user.teamId}
                      className="mt-2"
                      disabled
                    />
                  </div>
                )}

                <Button
                  onClick={handleSaveSettings}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {user?.role === "admin" && (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Manage team members and their permissions
                  </p>
                  <div className="flex items-center gap-3">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                          + Add New Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add New Team Member</DialogTitle>
                          <DialogDescription>
                            Create a new account for a team member. They will be
                            added to your team.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="member-name">Full Name</Label>
                            <Input
                              id="member-name"
                              placeholder="John Doe"
                              value={memberName}
                              onChange={(e) => setMemberName(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="member-email">Email</Label>
                            <Input
                              id="member-email"
                              type="email"
                              placeholder="john@example.com"
                              value={memberEmail}
                              onChange={(e) => setMemberEmail(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="member-password">Password</Label>
                            <Input
                              id="member-password"
                              type="password"
                              placeholder="Enter password (min 6 characters)"
                              value={memberPassword}
                              onChange={(e) => setMemberPassword(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateMember}
                            disabled={isCreatingMember}
                            className="bg-green-600 hover:bg-green-700 flex-1"
                          >
                            {isCreatingMember ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Member"
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      onClick={async () => {
                        // Refresh members list
                        if (!token) return;
                        setIsLoadingMembers(true);
                        try {
                          const res = await fetch("/api/auth/members", {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setMembers(data.members || []);
                          }
                        } catch (e) {
                          console.error(e);
                          toast.error("Failed to fetch members");
                        } finally {
                          setIsLoadingMembers(false);
                        }
                      }}
                    >
                      Refresh Members
                    </Button>
                  </div>

                  <div className="mt-4">
                    {isLoadingMembers ? (
                      <div className="text-sm text-slate-500">Loading...</div>
                    ) : members.length === 0 ? (
                      <div className="text-sm text-slate-500">No team members yet</div>
                    ) : (
                      <div className="space-y-2">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                            <div>
                              <div className="font-semibold">{m.name}</div>
                              <div className="text-xs text-slate-500">{m.email}</div>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 mr-3">{m.active ? 'Active' : 'Inactive'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Claim Settings */}
          <TabsContent value="claim" className="space-y-6 mt-6">
            {user?.role === "admin" ? (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Claim Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingSettings ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <Label>Lines per claim: {claimLineCount}</Label>
                          <span className="text-sm text-slate-500">
                            1 - 10 lines
                          </span>
                        </div>
                        <Slider
                          value={[claimLineCount]}
                          onValueChange={(value) => setClaimLineCount(value[0])}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <Label>
                            Cooldown period: {cooldownSeconds} seconds
                          </Label>
                          <span className="text-sm text-slate-500">
                            10 - 300 seconds
                          </span>
                        </div>
                        <Slider
                          value={[cooldownSeconds]}
                          onValueChange={(value) =>
                            setCooldownSeconds(value[0])
                          }
                          min={10}
                          max={300}
                          step={10}
                        />
                      </div>

                      <Button
                        onClick={handleSaveClaimSettings}
                        disabled={isSavingSettings}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSavingSettings ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Claim Settings"
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Claim Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    Your admin controls the claim settings for your team.
                  </p>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Current settings: 1 line per claim, 60 second cooldown
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Receive alerts for claims and distributions
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium">Sound Alerts</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Play sound for incoming messages
                    </p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>

                <Button
                  onClick={handleSaveSettings}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Password & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" className="mt-2" />
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    className="mt-2"
                  />
                </div>

                <Button className="bg-blue-600 hover:bg-blue-700">
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
