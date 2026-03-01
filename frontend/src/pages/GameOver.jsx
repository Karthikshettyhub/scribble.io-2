import { useLocation, useNavigate } from "react-router-dom";

function GameOver() {
  const location = useLocation();
  const navigate = useNavigate();
  const { players, username } = location.state || {};

  const sorted = [...(players || [])].sort((a, b) => b.score - a.score);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Game Over!</h1>
        <p style={styles.subtitle}>Final Scores</p>

        <div style={styles.list}>
          {sorted.map((player, i) => (
            <div
              key={player.socketId}
              style={{
                ...styles.playerRow,
                background: i === 0 ? "#1e1a00" : "#12122a",
                border: i === 0 ? "1px solid #eab308" : "1px solid #2d2d4e",
              }}
            >
              <span style={styles.medal}>{medals[i] || `#${i + 1}`}</span>
              <span style={styles.playerName}>
                {player.username}
                {player.socketId === sorted[0]?.socketId && " 👑"}
              </span>
              <span style={styles.score}>{player.score} pts</span>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/")} style={styles.btn}>
          🏠 Play Again
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0d0d1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#e2e8f0",
  },
  card: {
    background: "#12122a",
    border: "1px solid #2d2d4e",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "420px",
    textAlign: "center",
    boxShadow: "0 0 40px rgba(167,139,250,0.1)",
  },
  title: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#a78bfa",
    margin: "0 0 8px 0",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "24px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "28px",
  },
  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
  },
  medal: {
    fontSize: "20px",
    minWidth: "28px",
  },
  playerName: {
    flex: 1,
    textAlign: "left",
    fontWeight: "600",
    fontSize: "15px",
  },
  score: {
    color: "#a78bfa",
    fontWeight: "700",
    fontSize: "15px",
  },
  btn: {
    background: "#a78bfa",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    padding: "12px 32px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    width: "100%",
  },
};

export default GameOver;