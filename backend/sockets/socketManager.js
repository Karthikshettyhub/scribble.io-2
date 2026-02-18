const { createRoom, joinRoom, leaveRoom, getRoom } = require('../controllers/roomManager');
const { startGame, handleGuess } = require('../controllers/gameManager');

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

            const result = startGame(roomId);
            if (!result.success) {
                return socket.emit('error', { message: result.error });
            }

            const room = result.room;

            io.to(roomId).emit('game-started', {
                drawer: room.currentDrawer,
                players: room.players
            });

            io.to(room.currentDrawer).emit('your-word', {
                word: room.word
            });

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

                    const next = startGame(roomId);

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


        socket.on('guess', ({ guess }) => {

            const roomId = userRoomMap[socket.id];
            if (!roomId) {
                return socket.emit('error', { message: "Not in room" });
            }

            const result = handleGuess(roomId, socket.id, guess);

            if (!result.success) {
                return socket.emit('error', { message: result.error });
            }


            if (!result.correct) {
                return io.to(roomId).emit('chat-message', {
                    user: socket.id,
                    message: guess
                });
            }


            io.to(roomId).emit('round-ended', {
                winner: result.winner,
                word: result.word,
                players: result.players
            });

            if (roomTimers[roomId]) {
                clearTimeout(roomTimers[roomId]);
                delete roomTimers[roomId];
            }

            if (countdownIntervals[roomId]) {
                clearInterval(countdownIntervals[roomId]);
                delete countdownIntervals[roomId];
            }
        });

    }); // end connection
};

module.exports = socketManager;
