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
import { useSocket } from "@/hooks/useSocket";
import { LogoMark } from "@/components/Brand/Logo";

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
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar:collapsed");
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist collapsed state and notify parent
  useEffect(() => {
    try {
      localStorage.setItem("sidebar:collapsed", String(isCollapsed));
    } catch {}
    if (onCollapsedChange) onCollapsedChange(isCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed]);

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

  const socket = useSocket();
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== "admin") return false;
    return true;
  });

  const [unreadDistributor, setUnreadDistributor] = useState<number>(0);

  const getDistributorLastReadKey = () => `distributor_last_read_${user?.id ?? "global"}`;

  const computeUnread = async () => {
    try {
      if (!user) return 0;
      const res = await fetch(`/api/numbers/claimed-lines`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
      if (!res.ok) return 0;
      const data = await res.json();
      const distributed = (data.lines || []).filter((l: any) => Array.isArray(l.distributedTo) && l.distributedTo.length > 0);
      const last = Number(localStorage.getItem(getDistributorLastReadKey()) || 0);
      if (!last) return distributed.length;
      const count = distributed.filter((it: any) => {
        const t = Date.parse(it.claimedAt || it.updatedAt || it.createdAt);
        return !isNaN(t) && t > last;
      }).length;
      return count;
    } catch (e) {
      return 0;
    }
  };

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      const c = await computeUnread();
      if (!mounted) return;
      setUnreadDistributor(c);
    };
    update();

    const onStorage = () => {
      computeUnread().then((c) => setUnreadDistributor(c));
    };
    window.addEventListener('storage', onStorage);

    const onDistributorRead = () => {
      // mark as read in same window
      setUnreadDistributor(0);
    };
    window.addEventListener('distributor_read', onDistributorRead);

    if (socket) {
      const onDistributed = (data: any) => {
        // recompute unread when new distributed events arrive
        computeUnread().then((c) => setUnreadDistributor(c));
      };
      socket.on('distributed_lines', onDistributed);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('distributor_read', onDistributorRead);
        socket.off('distributed_lines', onDistributed);
        mounted = false;
      };
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('distributor_read', onDistributorRead);
      mounted = false;
    };
  }, [socket, user]);

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
          "fixed left-0 top-0 h-screen border-r border-slate-800 z-40 transition-all duration-300 flex flex-col shadow-xl bg-slate-900/90 backdrop-blur",
          isCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
              {/* Brand logo */}
              <LogoMark size={28} />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-white font-extrabold tracking-tight text-lg truncate">Line-Link</div>
                  <button
                    onClick={() => handleCollapseToggle(!isCollapsed)}
                    className="hidden md:inline-flex p-1 hover:bg-white/10 rounded-lg transition"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-white/80" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-white/80" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {isCollapsed && (
            <div className="mt-2 hidden md:flex justify-end">
              <button
                onClick={() => handleCollapseToggle(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4 text-white/80" />
              </button>
            </div>
          )}

          {!isCollapsed && (
            <div className="mt-3">
              <div className="text-white font-mono text-lg font-semibold">{time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</div>
              <div className="text-xs text-white/80 mt-0.5">{time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
          )}
        </div>


        {/* Account Info (slim) moved below header */}
        {!isCollapsed && user && (
          <div className="px-4 py-2 border-b border-transparent">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Account</p>
                <p className="text-sm text-white font-semibold truncate">{user.name}</p>
              </div>
              <div className="text-right ml-2">
                <p className="text-[10px] text-white/70 capitalize">{user.role}</p>
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
                  <span className="text-sm font-semibold">{item.label}
                    {item.path === '/inbox' && unreadDistributor > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center text-xs bg-red-600 text-white rounded-full w-5 h-5">{unreadDistributor}</span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer should remain visible */}
          <div className="px-3 pb-4">
            <div className="space-y-2">
              <button onClick={() => handleNavigate("/settings")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 transition-all">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                {!isCollapsed && <span className="text-sm font-semibold">Settings</span>}
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 transition-all">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                {!isCollapsed && <span className="text-sm font-semibold">Logout</span>}
              </button>
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
