const { createRoom, joinRoom, leaveRoom, getRoom } = require('../controllers/roomManager');
const { startNextRound, handleGuess } = require('../controllers/gameManager');

const socketManager = (io) => {

    const userRoomMap = {};
    const roomTimers = {};
    const countdownIntervals = {};

    io.on('connection', (socket) => {

        console.log("User connected:", socket.id);

        // =========================
        // CREATE ROOM
        // =========================
        socket.on('create-room', ({ roomId, username }) => {

            const player = {
                socketId: socket.id,
                username,
                score: 0
            };

            const result = createRoom(roomId, player);

            if (!result.success) {
                return socket.emit('error', { message: result.message });
            }

            socket.join(roomId);
            userRoomMap[socket.id] = roomId;

            socket.emit('room-created', result.room);
        });

        socket.on('join-room', ({ roomId, username }) => {

            const player = {
                socketId: socket.id,
                username,
                score: 0
            };

            const result = joinRoom(roomId, player);

            if (!result.success) {
                return socket.emit('error', { message: result.message });
            }

            socket.join(roomId);
            userRoomMap[socket.id] = roomId;

            io.to(roomId).emit('room-updated', result.room);
        });


        socket.on('leave-room', () => {

            const roomId = userRoomMap[socket.id];
            if (!roomId) return;

            leaveRoom(roomId, socket.id);
            socket.leave(roomId);

            const updatedRoom = getRoom(roomId);
            if (updatedRoom) {
                io.to(roomId).emit('room-updated', updatedRoom);
            }

            delete userRoomMap[socket.id];
        });
        socket.on("draw", ({ roomId, x, y, px, py, color, brushSize, tool }) => {
            socket.to(roomId).emit("draw", { x, y, px, py, color, brushSize, tool });
        });

        socket.on("clear-canvas", ({ roomId }) => {
            socket.to(roomId).emit("clear-canvas");
        });
        
        socket.on('disconnect', () => {

            const roomId = userRoomMap[socket.id];

            if (roomId) {
                leaveRoom(roomId, socket.id);

                const updatedRoom = getRoom(roomId);
                if (updatedRoom) {
                    io.to(roomId).emit('room-updated', updatedRoom);
                }

                delete userRoomMap[socket.id];
            }

            console.log("User disconnected:", socket.id);
        });


        socket.on('start-game', () => {

            const roomId = userRoomMap[socket.id];
            if (!roomId) {
                return socket.emit('error', { message: 'You are not in a room' });
            }

            const room = getRoom(roomId);

            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            // ✅ Minimum 2 players required
            if (room.players.length < 2) {
                return socket.emit('error', {
                    message: 'Need at least 2 players to start'
                });
            }

            // ✅ Host-only start
            if (room.host !== socket.id) {
                return socket.emit('error', {
                    message: 'Only host can start the game'
                });
            }

            // Now safe to start game
            const result = startNextRound(roomId);
            if (!result.success) {
                return socket.emit('error', { message: result.error });
            }

            const updatedRoom = result.room;

            io.to(roomId).emit('game-started', {
                drawer: updatedRoom.currentDrawer,
                players: updatedRoom.players
            });

            io.to(updatedRoom.currentDrawer).emit('your-word', {
                word: updatedRoom.word
            });

            // Clear old timers if exist
            if (roomTimers[roomId]) {
                clearTimeout(roomTimers[roomId]);
            }
            if (countdownIntervals[roomId]) {
                clearInterval(countdownIntervals[roomId]);
            }

            let timeLeft = 60;

            countdownIntervals[roomId] = setInterval(() => {
                timeLeft--;
                io.to(roomId).emit('timer', { timeLeft });

                if (timeLeft <= 0) {
                    clearInterval(countdownIntervals[roomId]);
                }
            }, 1000);

            roomTimers[roomId] = setTimeout(() => {

                const currentRoom = getRoom(roomId);
                if (!currentRoom || !currentRoom.gameStarted) return;

                const totalGuessers = currentRoom.players.length - 1;

                if (currentRoom.guessedPlayers.length === totalGuessers) {
                    return;
                }

                currentRoom.gameStarted = false;

                io.to(roomId).emit('round-ended', {
                    winner: null,
                    word: currentRoom.word,
                    players: currentRoom.players
                });

                clearInterval(countdownIntervals[roomId]);
                delete countdownIntervals[roomId];
                delete roomTimers[roomId];

                setTimeout(() => {

                    const next = startNextRound(roomId);

                    if (!next.success) {
                        return io.to(roomId).emit('game-over', {
                            players: getRoom(roomId)?.players || []
                        });
                    }

                    const newRoom = next.room;

                    io.to(roomId).emit('game-started', {
                        drawer: newRoom.currentDrawer,
                        players: newRoom.players
                    });

                    io.to(newRoom.currentDrawer).emit('your-word', {
                        word: newRoom.word
                    });

                }, 3000);

            }, 60000);
        });

        socket.on('get-room', ({ roomId }) => {
            const room = getRoom(roomId);
            if (room) socket.emit('room-updated', room);
            else socket.emit('error', { message: 'Room not found' });
        });

        socket.on('guess', ({ guess }) => {

            const roomId = userRoomMap[socket.id];
            if (!roomId) {
                return socket.emit('error', { message: "Not in room" });
            }

            const result = handleGuess(roomId, socket.id, guess);

            if (!result.success) {
                return socket.emit('error', { message: result.error });
            }

            // Wrong guess → normal chat
            if (!result.correct) {
                return io.to(roomId).emit('chat-message', {
                    user: socket.id,
                    message: guess
                });
            }

            // Correct guess but round NOT complete
            if (!result.roundComplete) {
                return io.to(roomId).emit('player-guessed', {
                    players: result.players
                });
            }

            // If ALL players guessed → end round
            io.to(roomId).emit('round-ended', {
                word: result.word,
                players: result.players
            });

            // Clear timers
            if (roomTimers[roomId]) {
                clearTimeout(roomTimers[roomId]);
                delete roomTimers[roomId];
            }

            if (countdownIntervals[roomId]) {
                clearInterval(countdownIntervals[roomId]);
                delete countdownIntervals[roomId];
            }

            // Start next round after 3 seconds
            setTimeout(() => {

                const next = startNextRound(roomId);

                if (!next.success || next.gameOver) {
                    return io.to(roomId).emit('game-over', {
                        players: next.room?.players || []
                    });
                }

                const room = next.room;

                io.to(roomId).emit('game-started', {
                    drawer: room.currentDrawer,
                    players: room.players,
                    round: room.round
                });

                io.to(room.currentDrawer).emit('your-word', {
                    word: room.word
                });

            }, 3000);
        });

    }); // end connection
};

module.exports = socketManager;
