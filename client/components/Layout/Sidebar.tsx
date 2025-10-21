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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  open = true,
  onClose,
  onCollapsedChange,
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
    { icon: SortAsc, label: "Numbers Sorter", path: "/numbers-sorter", adminOnly: true },
    { icon: Zap, label: "Auto Distributor", path: "/auto-distributor", adminOnly: true },
    { icon: ListTodo, label: "Queued List", path: "/queued-list", adminOnly: true },
    { icon: Clock, label: "Distributed Lines", path: "/distributed-lines" },
    { icon: Inbox, label: "Inbox", path: "/inbox" },
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
          "fixed left-0 top-0 h-screen border-r border-transparent z-40 transition-all duration-300 flex flex-col shadow-xl",
          isCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 40%, #ec4899 100%)",
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-2xl overflow-hidden">
                {/* Modern circular monogram logo */}
                <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="-mt-0.5">
                  <defs>
                    <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <circle cx="24" cy="24" r="22" fill="url(#lg2)" />
                  <path d="M15 30c0-6 6-10 9-10s9 4 9 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 18h18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {!isCollapsed && (
                <div>
                  <div className="text-white font-extrabold tracking-tight text-lg">Line-Link</div>
                  <div className="text-xs text-white/80">Admin Panel</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <div className="flex items-center gap-2 text-white">
                  <span className="text-sm font-mono font-bold">
                    {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
                  </span>
                </div>
              )}

              <button
                onClick={() => handleCollapseToggle(!isCollapsed)}
                className="hidden md:block p-1 hover:bg-white/10 rounded-lg transition"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-4 w-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>


        {/* Account Info */}
        {!isCollapsed && user && (
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Account
            </p>
            <p className="text-white font-semibold mt-1">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors",
                isCollapsed && "justify-center",
              )}
              title={isCollapsed ? item.label : ""}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => handleNavigate("/settings")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors",
              isCollapsed && "justify-center",
            )}
            title={isCollapsed ? "Settings" : ""}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Settings</span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors",
              isCollapsed && "justify-center",
            )}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
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
