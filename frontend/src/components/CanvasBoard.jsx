import { useEffect, useRef, useState } from "react";
import socket from "../socket";

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"
];

const BRUSH_SIZES = [3, 6, 10, 16];

function CanvasBoard({ roomId, isDrawer }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(6);
  const [tool, setTool] = useState("pen"); // pen or eraser

  // Draw on canvas from socket events (for non-drawers)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    socket.on("draw", ({ x, y, px, py, color, brushSize, tool }) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.strokeStyle = tool === "eraser" ? "#1a1a2e" : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    });

    socket.on("clear-canvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // refill background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("draw");
      socket.off("clear-canvas");
    };
  }, []);

  // Fill canvas background on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer) return;
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
  };

  const draw = (e) => {
    if (!isDrawer || !isDrawing.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#1a1a2e" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    socket.emit("draw", {
      roomId,
      x: pos.x,
      y: pos.y,
      px: lastPos.current.x,
      py: lastPos.current.y,
      color,
      brushSize: tool === "eraser" ? brushSize * 3 : brushSize,
      tool,
    });

    lastPos.current = pos;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear-canvas", { roomId });
  };

  return (
    <div style={styles.wrapper}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{
          ...styles.canvas,
          cursor: isDrawer ? (tool === "eraser" ? "cell" : "crosshair") : "default",
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Toolbar — only for drawer */}
      {isDrawer && (
        <div style={styles.toolbar}>
          {/* Color Palette */}
          <div style={styles.toolSection}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("pen"); }}
                style={{
                  ...styles.colorBtn,
                  background: c,
                  border: color === c && tool === "pen" ? "3px solid #a78bfa" : "2px solid #333",
                  transform: color === c && tool === "pen" ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>

          {/* Brush Sizes */}
          <div style={styles.toolSection}>
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                style={{
                  ...styles.sizeBtn,
                  border: brushSize === size ? "2px solid #a78bfa" : "2px solid #333",
                }}
              >
                <div style={{
                  width: size * 1.5,
                  height: size * 1.5,
                  borderRadius: "50%",
                  background: color,
                  margin: "auto"
                }} />
              </button>
            ))}
          </div>

          {/* Tools */}
          <div style={styles.toolSection}>
            <button
              onClick={() => setTool("pen")}
              style={{ ...styles.toolBtn, border: tool === "pen" ? "2px solid #a78bfa" : "2px solid #333" }}
            >
              ✏️
            </button>
            <button
              onClick={() => setTool("eraser")}
              style={{ ...styles.toolBtn, border: tool === "eraser" ? "2px solid #a78bfa" : "2px solid #333" }}
            >
              🧹
            </button>
            <button onClick={handleClear} style={styles.clearBtn}>
              🗑️ Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  canvas: {
    width: "100%",
    maxWidth: "800px",
    borderRadius: "12px",
    border: "2px solid #2d2d4e",
    boxShadow: "0 0 30px rgba(167,139,250,0.15)",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "center",
    background: "#12122a",
    padding: "12px 20px",
    borderRadius: "12px",
    border: "1px solid #2d2d4e",
    width: "100%",
    maxWidth: "800px",
  },
  toolSection: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  colorBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    cursor: "pointer",
    transition: "transform 0.1s",
  },
  sizeBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "#1a1a2e",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "#1a1a2e",
    cursor: "pointer",
    fontSize: "16px",
  },
  clearBtn: {
    padding: "6px 14px",
    borderRadius: "8px",
    background: "#3b1f1f",
    border: "2px solid #ef4444",
    color: "#ef4444",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px",
  },
};

export default CanvasBoard;