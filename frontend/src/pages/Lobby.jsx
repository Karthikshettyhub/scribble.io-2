import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";

function Lobby() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    socket.on("room-joined", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on("room-updated", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on("game-started", ({ drawer, players }) => {
      navigate(`/game/${roomId}`, { state: { username } });
    });

    socket.on("error", ({ message }) => {
      alert(message);
    });

    socket.emit("get-room", { roomId });

    return () => {
      socket.off("room-joined");
      socket.off("room-updated");
      socket.off("game-started");
      socket.off("error");
    };
  }, [roomId, username, navigate]);

  const handleStartGame = () => {
    socket.emit("start-game");
  };

  if (!room) return <h2>Loading...</h2>;

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Lobby</h1>
      <h3>Room ID: {roomId}</h3>
      <h2>Players:</h2>
      <ul>
        {room.players.map((player) => (
          <li key={player.socketId}>
            {player.username}
            {player.socketId === room.host && " 👑"}
          </li>
        ))}
      </ul>

      {socket.id === room.host && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
    </div>
  );
}

export default Lobby;