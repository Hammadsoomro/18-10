import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function initSocket() {
  if (typeof window === "undefined") return null;
  if (socket) return socket;

  socket = io(window.location.origin, { autoConnect: true });

  socket.on("connect", () => {
    // connected
  });

  socket.on("disconnect", () => {
    // disconnected
  });

  return socket;
}

export function useSocket(teamId: string | undefined, handlers: Record<string, (payload: any) => void> = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const s = initSocket();
    if (!s) return;

    if (teamId) {
      s.emit("join_team", teamId);
    }

    const wrap = (eventName: string) => (payload: any) => {
      const h = handlersRef.current[eventName];
      if (h) {
        try {
          h(payload);
        } catch (e) {
          console.error(`Socket handler for ${eventName} failed`, e);
        }
      }
    };

    const registered: Array<{ name: string; fn: (p: any) => void }> = [];
    for (const name of Object.keys(handlersRef.current)) {
      const fn = wrap(name);
      registered.push({ name, fn });
      s.on(name, fn);
    }

    return () => {
      // cleanup listeners
      for (const r of registered) {
        try {
          s.off(r.name, r.fn);
        } catch (e) {}
      }
    };
  }, [teamId]);
}
