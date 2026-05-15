import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000"));

export function useLiveAnalytics({ onEvent }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], withCredentials: true });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-analytics-room");
    });

    socket.on("disconnect", () => setConnected(false));

    const handler = (payload) => {
      if (typeof onEvent === "function") onEvent(payload);
    };

    socket.on("poll-total-updated", handler);
    socket.on("option-count-updated", handler);
    socket.on("poll-published", handler);

    socket.on("connect_error", (err) => {
      setConnected(false);
      console.warn("[socket] analytics connect error", err.message);
    });

    return () => {
      socket.emit("leave-analytics-room");
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [onEvent]);

  return { connected };
}
