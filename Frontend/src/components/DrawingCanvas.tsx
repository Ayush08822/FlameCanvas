import React, { useRef, useEffect, useState } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import "../App.css";

interface Point {
  x: number;
  y: number;
}

const MY_USER_ID = Math.random().toString(36).substr(2, 9);

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const stompClient = useRef<Client | null>(null);
  const remoteLastPoints = useRef<Record<string, Point>>({});

  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [color, setColor] = useState("#6366f1");
  const [lineWidth, setLineWidth] = useState(5);
  const [connected, setConnected] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      contextRef.current = ctx;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Setup WebSocket
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws-draw"),
      onConnect: () => {
        setConnected(true);
        (client.subscribe("/topic/public", (msg) => {
          const data = JSON.parse(msg.body);

          if (data.status === "USER_CLEAR") {
            const canvas = canvasRef.current;
            const ctx = contextRef.current;
            if (!canvas || !ctx) return;

            // 1. Wipe everything
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            remoteLastPoints.current = {};

            // 2. Redraw the world from the history provided by the server
            // Note: Use a simple line-to-line loop here for speed
            data.fullHistory.forEach((point: any) => {
              renderPoint(point); // Helper function to draw a single segment
            });
            return;
          }

          // Check if this is a global CLEAR command
          if (data.status === "CLEAR") {
            const canvas = canvasRef.current;
            if (canvas && contextRef.current) {
              // Clear the canvas for this user
              contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
              // Reset the remote points tracking
              remoteLastPoints.current = {};
            }
            return;
          }
          if (data.userId !== MY_USER_ID) handleRemoteDraw(data);
        }),
          client.subscribe("/topic/cursors", (msg) => {
            const data = JSON.parse(msg.body);
            if (data.userId !== MY_USER_ID) {
              setRemoteCursors((prev) => ({
                ...prev,
                [data.userId]: data, // Update or add the user's position
              }));
            }
          }));
      },
      onDisconnect: () => setConnected(false),
    });
    client.activate();
    stompClient.current = client;

    return () => {
      window.removeEventListener("resize", handleResize);
      client.deactivate();
    };
  }, []);

  const renderPoint = (point: any) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.strokeStyle = point.color;
    ctx.lineWidth = point.lineWidth;

    if (point.status === "START") {
      remoteLastPoints.current[point.userId] = { x: point.x, y: point.y };
    } else if (point.status === "DRAGGING") {
      const last = remoteLastPoints.current[point.userId];
      if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      remoteLastPoints.current[point.userId] = { x: point.x, y: point.y };
    }
  };

  const handleRemoteDraw = (data: any) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;

    if (data.status === "START") {
      remoteLastPoints.current[data.userId] = { x: data.x, y: data.y };
    } else if (data.status === "DRAGGING") {
      const last = remoteLastPoints.current[data.userId];
      if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      }
      remoteLastPoints.current[data.userId] = { x: data.x, y: data.y };
    } else if (data.status === "STOP") {
      delete remoteLastPoints.current[data.userId];
    }
  };

  const broadcast = (x: number, y: number, status: string) => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: "/app/draw/sendMessage",
        body: JSON.stringify({
          userId: MY_USER_ID,
          x,
          y,
          color,
          lineWidth,
          status,
        }),
      });
    }
  };

  const getPos = (e: React.MouseEvent): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    const p = getPos(e);
    setIsDrawing(true);
    setPoints([p]);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(p.x, p.y);
    broadcast(p.x, p.y, "START");
  };

  const draw = (e: React.MouseEvent) => {
    const currentP = getPos(e);

    // 1. Send cursor position for the "Indicators"
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: "/app/draw/cursorUpdate",
        body: JSON.stringify({
          userId: MY_USER_ID,
          x: currentP.x,
          y: currentP.y,
          color: color, // Use your current brush color for the cursor
        }),
      });
    }

    if (!isDrawing || !contextRef.current) return;
    const ctx = contextRef.current;
    const currentPoint = getPos(e);
    const newPoints = [...points, currentPoint];
    setPoints(newPoints);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    // Smooth Local Rendering
    if (newPoints.length > 2) {
      const lastThree = newPoints.slice(-3);
      const mid1 = {
        x: (lastThree[0].x + lastThree[1].x) / 2,
        y: (lastThree[0].y + lastThree[1].y) / 2,
      };
      const mid2 = {
        x: (lastThree[1].x + lastThree[2].x) / 2,
        y: (lastThree[1].y + lastThree[2].y) / 2,
      };
      ctx.beginPath();
      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(lastThree[1].x, lastThree[1].y, mid2.x, mid2.y);
      ctx.stroke();
    } else if (newPoints.length === 2) {
      ctx.beginPath();
      ctx.moveTo(newPoints[0].x, newPoints[0].y);
      ctx.lineTo(newPoints[1].x, newPoints[1].y);
      ctx.stroke();
    }
    broadcast(currentPoint.x, currentPoint.y, "DRAGGING");
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const last = points[points.length - 1];
    if (last) broadcast(last.x, last.y, "STOP");
    setPoints([]);
  };

  const handlePersonalClear = () => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: "/app/draw/clearMyStuff",
        body: JSON.stringify({ userId: MY_USER_ID }),
      });
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-white touch-none">
      <div
        className={`absolute top-4 left-4 z-20 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${connected ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"}`}
      >
        {connected ? "● Sync On" : "○ Offline"}
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center bg-zinc-900/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-2xl gap-8 border border-white/10">
        <div className="flex items-center gap-3">
          <label className="text-zinc-400 text-[15px] font-black uppercase tracking-[0.2em]">
            Color
          </label>
          <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/20">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute -top-1 -left-1 w-12 h-12 cursor-pointer bg-transparent border-none"
            />
          </div>
        </div>
        <div className="h-6 w-[1px] bg-white/10" />
        <div className="flex items-center gap-4">
          <label className="text-zinc-400 text-[15px] font-black uppercase tracking-[0.2em]">
            Size
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLineWidth(Math.max(1, lineWidth - 2))}
              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-mono font-black text-white w-6 text-center">
              {lineWidth}
            </span>
            <button
              onClick={() => setLineWidth(Math.min(50, lineWidth + 2))}
              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="h-6 w-[1px] bg-white/10" />
        <button
          onClick={handlePersonalClear}
          className="flex items-center gap-2 text-rose-400 hover:text-white hover:bg-rose-500/20 px-4 py-1.5 rounded-xl font-bold uppercase text-[15px]"
        >
          <Trash2 size={15} /> Clear
        </button>
      </div>

      {/* Render Remote Cursors */}
      {Object.values(remoteCursors).map((cursor: any) => (
        <div
          key={cursor.userId}
          className="pointer-events-none absolute z-50 transition-all duration-75 ease-out"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* The Cursor Icon */}
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: cursor.color }}
          />
          {/* User Label */}
          <span className="ml-4 px-2 py-0.5 bg-zinc-900 text-white text-[10px] rounded-md whitespace-nowrap opacity-75">
            User {cursor.userId.slice(0, 4)}
          </span>
        </div>
      ))}

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        className="block bg-white cursor-crosshair"
      />
    </div>
  );
};

export default DrawingCanvas;
