import { useRef, useEffect } from "react";
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

    const tryJoin = () => {
      try {
        if (socketRef.current && user?.teamId) {
          socketRef.current.emit("join_team", user.teamId);
        }
      } catch (e) {}
    };

    // join immediately if possible
    tryJoin();

    // also re-join on connect (handles reconnects)
    const onConnect = () => tryJoin();
    socketRef.current?.on("connect", onConnect);

    return () => {
      // cleanup connect listener; keep shared socket alive
      socketRef.current?.off("connect", onConnect);
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.teamId]);

  return sharedSocket;
}
