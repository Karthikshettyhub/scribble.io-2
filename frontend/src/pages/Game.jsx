import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import CanvasBoard from "../components/CanvasBoard";

function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  // ✅ Use passed state from Lobby as initial values
  const [drawer, setDrawer] = useState(location.state?.drawer || null);
  const [players, setPlayers] = useState(location.state?.players || []);
  const [word, setWord] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [messages, setMessages] = useState([]);
  const [guess, setGuess] = useState("");
  const [roundEndInfo, setRoundEndInfo] = useState(null);
  const [round, setRound] = useState(1);

  const chatEndRef = useRef(null);
  const playersRef = useRef(players); // ✅ ref to avoid stale closure in chat-message

  // Keep ref in sync with latest players
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socket.on("game-started", ({ drawer, players, round }) => {
      setDrawer(drawer);
      setPlayers(players);
      setWord(null);
      setRoundEndInfo(null);
      setMessages([]);
      setTimeLeft(60);
      if (round) setRound(round);
    });

    socket.on("your-word", ({ word }) => {
      setWord(word);
    });

    socket.on("timer", ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on("player-guessed", ({ players }) => {
      setPlayers(players);
      setMessages((prev) => [...prev, { type: "system", message: "Someone guessed correctly! 🎉" }]);
    });

    // ✅ Use playersRef instead of players to avoid stale closure
    socket.on("chat-message", ({ user, message }) => {
      const player = playersRef.current.find(p => p.socketId === user);
      setMessages((prev) => [...prev, {
        type: "chat",
        user: player?.username || user,
        message
      }]);
    });

    socket.on("round-ended", ({ word, players }) => {
      setRoundEndInfo({ word, players });
      setPlayers(players);
      setMessages((prev) => [...prev, {
        type: "system",
        message: `Round over! The word was: "${word}"`
      }]);
    });

    socket.on("game-over", ({ players }) => {
      navigate("/gameover", { state: { players, username } });
    });

    socket.on("error", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off("game-started");
      socket.off("your-word");
      socket.off("timer");
      socket.off("player-guessed");
      socket.off("chat-message");
      socket.off("round-ended");
      socket.off("game-over");
      socket.off("error");
    };
  }, [username, navigate]); // ✅ no players in deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isDrawer = socket.id === drawer;

  const handleGuess = () => {
    if (!guess.trim()) return;
    socket.emit("guess", { guess });
    setGuess("");
  };

  const timerColor = timeLeft > 30 ? "#22c55e" : timeLeft > 10 ? "#f97316" : "#ef4444";

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🎨 Scribble</span>
          <span style={styles.roomBadge}>Room: {roomId}</span>
        </div>
        <div style={{ ...styles.timer, color: timerColor, borderColor: timerColor }}>
          ⏱ {timeLeft}s
        </div>
        <div style={styles.roundBadge}>Round {round}</div>
      </div>

      {/* Word hint */}
      <div style={styles.wordBar}>
        {isDrawer && word ? (
          <span style={styles.wordText}>Your word: <b style={{ color: "#a78bfa" }}>{word}</b></span>
        ) : (
          <span style={styles.wordText}>
            {roundEndInfo
              ? <>The word was: <b style={{ color: "#a78bfa" }}>{roundEndInfo.word}</b></>
              : isDrawer ? "Waiting for word..." : "Guess the drawing!"}
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={styles.main}>
        {/* Players sidebar */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Players</h3>
          {players.map((player, i) => (
            <div
              key={player.socketId}
              style={{
                ...styles.playerCard,
                border: player.socketId === drawer ? "1px solid #a78bfa" : "1px solid #2d2d4e",
              }}
            >
              <div style={styles.playerRank}>#{i + 1}</div>
              <div style={styles.playerInfo}>
                <span style={styles.playerName}>
                  {player.username}
                  {player.socketId === socket.id && " (you)"}
                  {player.socketId === drawer && " 🎨"}
                </span>
                <span style={styles.playerScore}>{player.score} pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={styles.canvasArea}>
          <CanvasBoard roomId={roomId} isDrawer={isDrawer} />
        </div>

        {/* Chat */}
        <div style={styles.chatPanel}>
          <h3 style={styles.sidebarTitle}>
            {isDrawer ? "💬 Chat" : "💬 Guess!"}
          </h3>
          <div style={styles.chatMessages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={msg.type === "system" ? styles.systemMsg : styles.chatMsg}
              >
                {msg.type === "chat" && (
                  <span style={styles.chatUser}>{msg.user}: </span>
                )}
                <span>{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {!isDrawer && (
            <div style={styles.guessInput}>
              <input
                type="text"
                placeholder="Type your guess..."
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                style={styles.input}
              />
              <button onClick={handleGuess} style={styles.sendBtn}>→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0d0d1a",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    gap: "10px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#12122a",
    padding: "10px 20px",
    borderRadius: "12px",
    border: "1px solid #2d2d4e",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#a78bfa",
  },
  roomBadge: {
    background: "#1e1e3f",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    color: "#94a3b8",
    border: "1px solid #2d2d4e",
  },
  timer: {
    fontSize: "22px",
    fontWeight: "bold",
    border: "2px solid",
    borderRadius: "10px",
    padding: "4px 16px",
    transition: "color 0.3s, border-color 0.3s",
    minWidth: "80px",
    textAlign: "center",
  },
  roundBadge: {
    background: "#1e1e3f",
    padding: "4px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    color: "#a78bfa",
    border: "1px solid #2d2d4e",
  },
  wordBar: {
    background: "#12122a",
    padding: "10px 20px",
    borderRadius: "10px",
    border: "1px solid #2d2d4e",
    textAlign: "center",
  },
  wordText: {
    fontSize: "16px",
    color: "#94a3b8",
  },
  main: {
    display: "flex",
    gap: "12px",
    flex: 1,
    alignItems: "flex-start",
  },
  sidebar: {
    width: "160px",
    flexShrink: 0,
    background: "#12122a",
    borderRadius: "12px",
    border: "1px solid #2d2d4e",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sidebarTitle: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    color: "#a78bfa",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  playerCard: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    borderRadius: "8px",
    background: "#1a1a2e",
  },
  playerRank: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "bold",
    minWidth: "16px",
  },
  playerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "hidden",
  },
  playerName: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#e2e8f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  playerScore: {
    fontSize: "11px",
    color: "#a78bfa",
  },
  canvasArea: {
    flex: 1,
    minWidth: 0,
  },
  chatPanel: {
    width: "200px",
    flexShrink: 0,
    background: "#12122a",
    borderRadius: "12px",
    border: "1px solid #2d2d4e",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    height: "600px",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingRight: "4px",
  },
  chatMsg: {
    fontSize: "12px",
    color: "#cbd5e1",
    wordBreak: "break-word",
    lineHeight: "1.4",
  },
  chatUser: {
    color: "#a78bfa",
    fontWeight: "600",
  },
  systemMsg: {
    fontSize: "11px",
    color: "#22c55e",
    fontStyle: "italic",
    textAlign: "center",
    padding: "4px",
    background: "#0f2a1a",
    borderRadius: "6px",
  },
  guessInput: {
    display: "flex",
    gap: "6px",
  },
  input: {
    flex: 1,
    background: "#1a1a2e",
    border: "1px solid #2d2d4e",
    borderRadius: "8px",
    padding: "8px",
    color: "#e2e8f0",
    fontSize: "12px",
    outline: "none",
    minWidth: 0,
  },
  sendBtn: {
    background: "#a78bfa",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  },
};

export default Game;