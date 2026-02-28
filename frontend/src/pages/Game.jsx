import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import CanvasBoard from "../components/CanvasBoard";

function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  const [drawer, setDrawer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [word, setWord] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [messages, setMessages] = useState([]);
  const [guess, setGuess] = useState("");
  const [roundEndInfo, setRoundEndInfo] = useState(null);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socket.on("game-started", ({ drawer, players }) => {
      setDrawer(drawer);
      setPlayers(players);
      setWord(null);
      setRoundEndInfo(null);
      setMessages([]); // ✅ clear chat on new round
    });

    socket.on("your-word", ({ word }) => {
      setWord(word);
    });

    socket.on("timer", ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on("player-guessed", ({ players }) => {
      setPlayers(players);
    });

    socket.on("chat-message", ({ user, message }) => {
      setMessages((prev) => [...prev, { user, message }]);
    });

    socket.on("round-ended", ({ word, players }) => {
      setRoundEndInfo({ word, players });
      setPlayers(players);
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
  }, [username, navigate]);

  const isDrawer = socket.id === drawer;

  const handleGuess = () => {
    if (!guess) return;
    socket.emit("guess", { guess });
    setGuess("");
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Game Room: {roomId}</h1>

      <h3>Time Left: {timeLeft}s</h3>

      {drawer && (
        <h3>{isDrawer ? `You are drawing 🎨 — Word: ${word}` : "Someone else is drawing"}</h3>
      )}

      {roundEndInfo && (
        <h3>Round Over! The word was: <b>{roundEndInfo.word}</b></h3>
      )}

      <CanvasBoard roomId={roomId} isDrawer={isDrawer} />

      {/* Players & Scores */}
      <div>
        <h3>Players:</h3>
        <ul style={{ listStyle: "none" }}>
          {players.map((player) => (
            <li key={player.socketId}>
              {player.username} — {player.score} pts
              {player.socketId === drawer && " 🎨"}
            </li>
          ))}
        </ul>
      </div>

      {/* Guess Input */}
      {!isDrawer && (
        <div>
          <input
            type="text"
            placeholder="Type your guess..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGuess()}
          />
          <button onClick={handleGuess}>Guess</button>
        </div>
      )}

      {/* Chat Messages */}
      <div style={{ marginTop: "20px" }}>
        {messages.map((msg, i) => (
          <p key={i}><b>{msg.user}:</b> {msg.message}</p>
        ))}
      </div>
    </div>
  );
}

export default Game;