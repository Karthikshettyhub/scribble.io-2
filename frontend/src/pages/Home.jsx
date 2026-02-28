import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

function Home() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("room-created", (room) => {
      navigate(`/lobby/${room.id}`, { state: { username } });
    });

    socket.on("room-updated", (room) => {
      navigate(`/lobby/${room.id}`, { state: { username } });
    });

    socket.on("error", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off("room-created");
      socket.off("room-updated");
      socket.off("error");
    };
  }, [username, navigate]);

  const handleCreateRoom = () => {
    if (!username || !roomId) return alert("Enter all details");
    socket.emit("create-room", { roomId, username });
  };

  const handleJoinRoom = () => {
    if (!username || !roomId) return alert("Enter all details");
    socket.emit("join-room", { roomId, username });
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>Scribble Game</h1>
      <input
        type="text"
        placeholder="Enter Your Name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br /><br />
      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <br /><br />
      <button onClick={handleCreateRoom}>Create Room</button>
      &nbsp;&nbsp;
      <button onClick={handleJoinRoom}>Join Room</button>
    </div>
  );
}

export default Home;