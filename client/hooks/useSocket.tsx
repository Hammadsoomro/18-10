import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

let sharedSocket: Socket | null = null;

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // create shared socket once
    if (!sharedSocket) {
      try {
        sharedSocket = io(undefined, { autoConnect: true });
      } catch (e) {
        console.error("Socket init error", e);
      }
    }

    socketRef.current = sharedSocket;

    // join team room when user is available
    if (socketRef.current && user?.teamId) {
      socketRef.current.emit("join_team", user.teamId);
    }

    return () => {
      // don't disconnect shared socket on component unmount
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teamId]);

  return sharedSocket;
}
