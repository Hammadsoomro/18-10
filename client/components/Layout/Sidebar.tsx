import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircle,
  SortAsc,
  Zap,
  ListTodo,
  Inbox,
  Settings,
  LogOut,
  Menu,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsed?: boolean;
}

export function Sidebar({
  open = true,
  onClose,
  onCollapsedChange,
  collapsed,
}: SidebarProps) {
  const [time, setTime] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(open);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleCollapseToggle = (newCollapsedState: boolean) => {
    setIsCollapsed(newCollapsedState);
    if (onCollapsedChange) {
      onCollapsedChange(newCollapsedState);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof collapsed === "boolean") {
      setIsCollapsed(collapsed);
    }
  }, [collapsed]);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: MessageCircle, label: "Conversation", path: "/conversation" },
    { icon: Inbox, label: "Inbox", path: "/inbox" },
    {
      icon: SortAsc,
      label: "Numbers Sorter",
      path: "/numbers-sorter",
      adminOnly: true,
    },
    {
      icon: ListTodo,
      label: "Queued List",
      path: "/queued-list",
      adminOnly: true,
    },
    { icon: Clock, label: "Distributed Lines", path: "/distributed-lines" },
    {
      icon: Zap,
      label: "Auto Distributor",
      path: "/auto-distributor",
      adminOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== "admin") return false;
    return true;
  });

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed md:hidden top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-800 border-slate-700"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen border-r border-transparent z-40 transition-all duration-300 flex flex-col shadow-xl sidebar-gradient",
          isCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
              {/* logo (external asset) */}
              <img
                src="https://cdn.builder.io/o/assets%2F13331b2ed0834c738201e986b4f369af%2Fecd70b64eebe4d40acd0af01614f0b02?alt=media&token=c167c7c3-d78b-4c39-ae58-8c2c3be041cb&apiKey=13331b2ed0834c738201e986b4f369af"
                alt="Line-Link logo"
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-white font-extrabold tracking-tight text-lg truncate">
                    Line-Link
                  </div>
                  <button
                    onClick={() => handleCollapseToggle(!isCollapsed)}
                    className="md:hidden p-1 hover:bg-white/10 rounded-lg transition"
                    aria-label="Toggle sidebar"
                  >
                    <Menu className="h-4 w-4 text-white/80" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="mt-3">
              <div className="text-white font-mono text-lg font-semibold">
                {time.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
              <div className="text-xs text-white/80 mt-0.5">
                {time.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          )}
        </div>

        {/* Account Info (slim) moved below header */}
        {!isCollapsed && user && (
          <div className="px-4 py-2 border-b border-transparent">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] text-white/80 uppercase tracking-wider">
                  Account
                </p>
                <p className="text-sm text-white font-semibold truncate">
                  {user.name}
                </p>
              </div>
              <div className="text-right ml-2">
                <p className="text-[10px] text-white/70 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - fills remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
            {visibleNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/90 hover:scale-[1.02] transform-gpu transition-all duration-200",
                  isCollapsed && "justify-center",
                )}
                title={isCollapsed ? item.label : ""}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                {!isCollapsed && (
                  <span className="text-sm font-semibold">{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer should remain visible */}
          <div className="px-3 pb-4">
            <div className={cn("px-4 pb-4 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
              <div className={cn(isCollapsed ? "flex flex-col items-center space-y-2" : "flex items-center gap-2")}>
                <button
                  onClick={() => handleNavigate("/settings")}
                  aria-label="Settings"
                  title="Settings"
                  className={cn("rounded-lg bg-white/10 text-white/90 hover:bg-white/20 transition", isCollapsed ? "p-2" : "p-2")}
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                  className={cn("rounded-lg bg-white/10 text-red-400 hover:bg-red-900/20 transition", isCollapsed ? "p-2" : "p-2")}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
              <div className="hidden md:flex items-center">
                <button
                  onClick={() => handleCollapseToggle(!isCollapsed)}
                  className="p-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 transition"
                  aria-label={
                    isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Content offset */}
      <div
        className="hidden md:block"
        style={{ width: isCollapsed ? "80px" : "256px" }}
      />
    </>
  );
}
