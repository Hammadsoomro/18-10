import { useState, useEffect } from "react";
import { Moon, Sun, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "./ProfileMenu";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  title?: string;
  sidebarCollapsed?: boolean;
}

export function Navbar({
  title = "Dashboard",
  sidebarCollapsed = false,
}: NavbarProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [claimCooldown, setClaimCooldown] = useState(0);

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

  // Cooldown display
  useEffect(() => {
    let timer: number | undefined;
    const key = `claim_cooldown_${user?.id ?? "global"}`;

    const syncFromStorage = () => {
      const v = localStorage.getItem(key);
      if (!v) {
        setClaimCooldown(0);
        return;
      }
      const expiry = Number(v);
      const rem = Math.ceil((expiry - Date.now()) / 1000);
      if (rem > 0) setClaimCooldown(rem);
      else setClaimCooldown(0);
    };

    const startTimer = () => {
      clearInterval(timer);
      timer = window.setInterval(() => {
        setClaimCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000) as unknown as number;
    };

    syncFromStorage();
    if (claimCooldown > 0) startTimer();

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) syncFromStorage();
    };
    const onCustom = (e: any) => {
      const detail = e?.detail;
      if (!detail || !detail.expiry) return;
      const rem = Math.ceil((detail.expiry - Date.now()) / 1000);
      if (rem > 0) setClaimCooldown(rem);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("claim_cooldown_updated", onCustom as EventListener);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("claim_cooldown_updated", onCustom as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

        {/* Cooldown badge */}
        {claimCooldown > 0 && (
          <div className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 px-2 py-1 rounded">
            {claimCooldown}s
          </div>
        )}

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
