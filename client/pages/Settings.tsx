import { useState } from "react";
import { Layout } from "@/components/Layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Users, Clock, Bell, Lock } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [claimLineCount, setClaimLineCount] = useState(1);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully");
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
                  <Button className="bg-green-600 hover:bg-green-700">
                    + Add New Member
                  </Button>
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
                      <Label>Cooldown period: {cooldownSeconds} seconds</Label>
                      <span className="text-sm text-slate-500">
                        10 - 300 seconds
                      </span>
                    </div>
                    <Slider
                      value={[cooldownSeconds]}
                      onValueChange={(value) => setCooldownSeconds(value[0])}
                      min={10}
                      max={300}
                      step={10}
                    />
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Save Claim Settings
                  </Button>
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
