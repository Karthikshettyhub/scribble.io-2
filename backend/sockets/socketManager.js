const { createRoom, joinRoom, leaveRoom, getRoom } = require('../controllers/roomManager');
const { startGame, handleGuess } = require('../controllers/gameManager');


const socketManager = (io) => {
    const userRoomMap = {};
    const roomTimers = {};

    io.on('connection', (socket) => {

        console.log("user connected: ", socket.id);


        // CREATE ROOM
        socket.on('create-room', ({ roomId, username }) => {

            const player = {
                socketId: socket.id,
                username,
                score: 0
            }
            const result = createRoom(roomId, player);

            if (!result.success) {
                return socket.emit('error', { message: result.message });
            }

            socket.join(roomId);
            userRoomMap[socket.id] = roomId;

            socket.emit('room-created', result.room);
        });


        // JOIN ROOM
        socket.on('join-room', ({ roomId, username }) => {
            const player = {
                socketId: socket.id,
                username,
                score: 0
            }

            const result = joinRoom(roomId, player);

            if (!result.success) {
                return socket.emit('error', { message: result.message });
            }

            socket.join(roomId);
            userRoomMap[socket.id] = roomId;

            io.to(roomId).emit('room-updated', result.room);

        });


        // LEAVE ROOM
        socket.on('leave-room', () => {
            const roomId = userRoomMap[socket.id];

            if (!roomId) {
                return;
            }

            leaveRoom(roomId, socket.id);
            socket.leave(roomId);

            const updateRoom = getRoom(roomId);

            if (updateRoom) {
                io.to(roomId).emit('room-updated', updateRoom);
            }

            delete userRoomMap[socket.id];

        });


        // DISCONNECT
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


        // START GAME
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

            // Clear previous timer if exists
            if (roomTimers[roomId]) {
                clearTimeout(roomTimers[roomId]);
            }

            // 60-second round timer
            let timeLeft = 60; 

            // Emit countdown every second
            const countdownInterval = setInterval(() => {
                timeLeft--;
                io.to(roomId).emit('timer', { timeLeft });

                if (timeLeft <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);

            roomTimers[roomId] = setTimeout(() => {
                // Time's up → end round
                const room = getRoom(roomId);

                if (room && room.gameStarted) {
                    room.gameStarted = false;

                    io.to(roomId).emit('round-ended', {
                        winner: null,
                        word: room.word,
                        players: room.players
                    });
                }

                clearInterval(countdownInterval);
                delete roomTimers[roomId];

            }, 60000); // 60 seconds

        })


        // GUESS
        socket.on('guess', ({ guess }) => {

            const roomId = userRoomMap[socket.id];

            if (!roomId) {
                return socket.emit('error', { message: "Not in room" });
            }

            const result = handleGuess(roomId, socket.id, guess);

            if (!result.success) {
                return socket.emit('error', { message: result.error });
            }

            // Wrong guess → broadcast as chat
            if (!result.correct) {
                return io.to(roomId).emit('chat-message', {
                    user: socket.id,
                    message: guess
                });
            }

            // Correct guess → end round
            io.to(roomId).emit('round-ended', {
                winner: result.winner,
                word: result.word,
                players: result.players
            });

            if (roomTimers[roomId]) {
                clearTimeout(roomTimers[roomId]);
                delete roomTimers[roomId];
            }

        });

    });
};

module.exports = socketManager;
