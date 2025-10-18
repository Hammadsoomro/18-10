import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, MapPin, Calendar } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const joinDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Layout title="Profile">
      <div className="p-6 max-w-2xl">
        {/* Profile Header */}
        <Card className="border-slate-200 dark:border-slate-800 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white font-bold text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {user.name}
              </h1>

              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2 capitalize">
                {user.role} Account
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Email
                  </p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {user.email}
                  </p>
                </div>
              </div>

              {user.teamId && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Team
                    </p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {user.teamId}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Member Since
                  </p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {joinDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  User ID
                </p>
                <p className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                  {user.id}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Account Type
                </p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === "admin"
                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400"
                      : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                  }`}
                >
                  {user.role === "admin" ? "Administrator" : "Team Member"}
                </span>
              </div>

              {user.adminId && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Admin ID
                  </p>
                  <p className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all">
                    {user.adminId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Summary */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  42
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Lines Claimed
                </p>
              </div>

              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  156
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Total Claims
                </p>
              </div>

              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  8
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Days Active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
