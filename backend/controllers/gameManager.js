const { getRoom } = require('./roomManager');

const words = [
    'apple',
    'banana',
    'house',
    'car',
    'tree',
    'dog',
    'cat',
    'book',
    'phone',
    'computer',
];

const getRandomWord = () => {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
}

const getRandomDrawer = (players) => {
    const index = Math.floor(Math.random() * players.length);
    return players[index];
}

const startGame = (roomId) => {
    const room = getRoom(roomId);

    if(!room){
        return {success:false, error: 'Room not found' };
    }

    if(room.players.length < 2){
        return {success:false, error: 'Not enough players to start the game' };
    }
    const drawer = getRandomDrawer(room.players);
    const word = getRandomWord();
    room.gameStarted = true;
    room.currentDrawer = drawer.socketId;
    room.word = word;

    return { success:true,room };

};

module.exports = {
    startGame,
};