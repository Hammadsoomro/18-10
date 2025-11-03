import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title = "Dashboard" }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const socket = useSocket();
  const prevCooldownRef = useRef<number | null>(null);

  // Global listener for claim cooldown finishing (works across pages)
  useEffect(() => {
    const cooldownKey = `claim_cooldown_${user?.id ?? "global"}`;

    const playNotification = () => {
      try {
        // show toast
        // @ts-ignore
        import("sonner").then(({ toast }) => toast.info("Claim available now"));
      } catch (e) {}

      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(880, ctx.currentTime);
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.stop();
          ctx.close();
        }, 400);
      } catch (e) {}

      try {
        if ((window as any).Notification && Notification.permission === "granted") {
          new Notification("Line Claim Available", { body: "You can now claim the next line." });
        } else if ((window as any).Notification && Notification.permission !== "denied") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") new Notification("Line Claim Available", { body: "You can now claim the next line." });
          });
        }
      } catch (e) {}
    };

    const onCustom = (e: any) => {
      // custom event dispatched when cooldown is updated; check storage to know if expired
      try {
        const v = localStorage.getItem(cooldownKey);
        if (!v) {
          // cooldown ended
          playNotification();
        } else {
          // still active; store previous
          prevCooldownRef.current = Number(v);
        }
      } catch (e) {}
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== cooldownKey) return;
      if (!e.newValue) {
        // removed -> cooldown finished
        playNotification();
      }
    };

    window.addEventListener("claim_cooldown_updated", onCustom as EventListener);
    window.addEventListener("storage", onStorage);

    // also listen to server-side claim_indicator for cross-client notifications
    const onClaimIndicator = (data: any) => {
      try {
        if (data && data.ready) playNotification();
      } catch (e) {}
    };
    if (socket) socket.on("claim_indicator", onClaimIndicator);

    return () => {
      window.removeEventListener("claim_cooldown_updated", onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
      if (socket) socket.off("claim_indicator", onClaimIndicator);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, socket]);

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar title={title} sidebarCollapsed={sidebarCollapsed} />

        {/* Page content */}
        <main className="flex-1 overflow-auto pt-16 md:pt-16">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
