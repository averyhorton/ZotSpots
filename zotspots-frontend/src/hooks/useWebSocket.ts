import { useEffect, useRef, useState } from "react";

export const useWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "error" | "closed">("connecting");

  useEffect(() => {
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => setStatus("open");
    socket.onclose = () => setStatus("closed");
    socket.onerror = () => setStatus("error");

    return () => socket.close();
  }, [url]);

  const sendMessage = (msg: object) => {
    ws.current?.send(JSON.stringify(msg));
  };

  return { ws: ws.current, status, sendMessage };
};