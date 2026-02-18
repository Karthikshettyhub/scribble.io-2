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

    if (!room) {
        return { success: false, error: 'Room not found' };
    }

    if (room.players.length < 2) {
        return { success: false, error: 'Not enough players to start the game' };
    }
    const drawer = getRandomDrawer(room.players);
    const word = getRandomWord();
    room.gameStarted = true;
    room.currentDrawer = drawer.socketId;
    room.word = word;

    return { success: true, room };

};

const handleGuess = (roomId, socketId, guess) => {
    const room = getRoom(roomId);
    
    if (!room) {
        return { success: false, error: 'room not found' };
    }
    
    if (!room.gameStarted) {
        return { success: false, error: 'game not started' };
    }
    
    if (room.currentDrawer === socketId) {
        return { success: false, error: 'drawer cannot guess' };
    }
    
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = room.word.trim().toLowerCase();
    
    if (normalizedGuess === normalizedWord) {
        const player = room.players.find(p => {
            if (p.socketId === socketId) {
                return p;
            }
        });
        
       
        if (!player) {
            return { success: false, error: 'player not found in room' };
        }
        
        player.score = player.score + 10;
        room.gameStarted = false;
        
        return {
            success: true,
            correct: true,
            winner: socketId,
            word: room.word,
            players: room.players
        };
    }
    
    return {
        success: true,
        correct: false
    };
};
const startNextRound = (roomId) => {
    const room = getRoom(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    room.round += 1;

    if (room.round > room.totalRounds) {
        // Game over
        room.gameStarted = false;
        return { success: true, gameOver: true, room };
    }

    // Pick next drawer
    const drawer = rotateDrawer(room);
    const word = getRandomWord();
    room.word = word;
    room.gameStarted = true;

    return { success: true, gameOver: false, room };
};




const randomDrawer = (roomId) => {
    room.drawerIndex = (room.drawerIndex + 1) % room.players.length;
    const drawer = room.players[room.drawerIndex];
    room.currentDrawer = drawer.socketId;
    return drawer;
};

module.exports = {
    startGame,
    handleGuess,
    randomDrawer,
    startNextRound
};