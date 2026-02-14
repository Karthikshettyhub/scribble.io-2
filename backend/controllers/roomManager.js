const rooms = {};

const createRoom = (roomId, player) => {
    if(rooms[roomId]){
        return { success:false,message:'Room already exists' };
    }

    rooms[roomId] = {
        id: roomId,
        players: [player],
        gameStarted: false,
        currentDrawer: null,
        word: null
    };

    return { success:true,room: rooms[roomId] };
};

const joinRoom = (roomId,player) => {
    const room = rooms[roomId];

    if(!room){
        return { success:false,message:'Room does not exist' };
    }

    room.players.push(player);

    return { success:true,room };

};

const leaveRoom = (roomId,socketId) => {
      
    const room = rooms[roomId];

    if(!room){
        return;
    }

    room.players = room.players.filter((player) => player.socketId !== socketId);

    if(room.players.length === 0){
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