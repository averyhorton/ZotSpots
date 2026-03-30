import { useEffect, useRef, useState } from "react";

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export const useWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setConnected(true);

    ws.current.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    ws.current.onclose = () => setConnected(false);

    return () => ws.current?.close();
  }, [url]);

  const sendMessage = (msg: WSMessage) => {
    if (ws.current && connected) ws.current.send(JSON.stringify(msg));
  };

  return { messages, sendMessage, connected };
};