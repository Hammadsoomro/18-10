import { useState, useEffect } from "react";
import { Moon, Sun, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "./ProfileMenu";

interface NavbarProps {
  title?: string;
  sidebarCollapsed?: boolean;
}

export function Navbar({ title = "Dashboard", sidebarCollapsed = false }: NavbarProps) {
  const [isDark, setIsDark] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <nav
      className="fixed top-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 flex items-center justify-between px-6 shadow-sm transition-all duration-300 left-0 md:left-auto"
      style={{
        marginLeft: `${sidebarCollapsed ? "80px" : "256px"}`,
        width: `calc(100% - ${sidebarCollapsed ? "80px" : "256px"})`,
      }}
    >
      <div className="flex-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Profile Menu */}
        <ProfileMenu />
      </div>
    </nav>
  );
}
