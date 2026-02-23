const rooms = {};

const createRoom = (roomId, player) => {
    if (rooms[roomId]) {
        return { success: false, message: 'Room already exists' };
    }

    rooms[roomId] = {
        id: roomId,
        players: [player],
        gameStarted: false,
        currentDrawer: null,
        word: null,
        round: 0,
        totalRounds: 3,  // total rounds per game
        drawerIndex: 0,
        guessedPlayers: []
    };

    return { success: true, room: rooms[roomId] };
};

const joinRoom = (roomId, player) => {
    const room = rooms[roomId];

    if (!room) {
        return { success: false, message: 'Room does not exist' };
    }
    const alreadyInRoom = room.players.some(
        p => p.socketId === player.socketId
    );

    if (alreadyInRoom) {
        return { success: false, message: 'Player already in room' };
    }
    room.players.push(player);

    return { success: true, room };

};

const leaveRoom = (roomId, socketId) => {

    const room = rooms[roomId];
    if (!room) return;

    const leavingPlayerIndex = room.players.findIndex(
        player => player.socketId === socketId
    );

    if (leavingPlayerIndex === -1) return;

    const wasDrawer = room.currentDrawer === socketId;

    room.players.splice(leavingPlayerIndex, 1);


    if (leavingPlayerIndex < room.drawerIndex) {
        room.drawerIndex--;
    }

    // If drawer left, end current round safely
    if (wasDrawer) {
        room.gameStarted = false;
    }

    if (room.players.length === 0) {
        delete rooms[roomId];
    }

};

const getRoom = (roomId) => {
    return rooms[roomId];
};

module.exports = {
    createRoom,
    joinRoom,
    leaveRoom,
    getRoom
}