import { useEffect, useRef } from "react";
import socket from "../socket";

function CanvasBoard({ roomId, isDrawer }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    socket.on("draw", ({ x, y, isDrawing: drawing, color }) => {
      if (drawing) {
        ctx.lineTo(x, y);
        ctx.strokeStyle = color || "black";
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    });

    return () => {
      socket.off("draw");
    };
  }, []);

  const handleMouseDown = (e) => {
    if (!isDrawer) return;
    isDrawing.current = true;
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDrawer || !isDrawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket.emit("draw", { roomId, x, y, isDrawing: true, color: "black" });
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={500}
      style={{ border: "2px solid black", cursor: isDrawer ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    />
  );
}

export default CanvasBoard;