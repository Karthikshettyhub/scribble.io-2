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


const handleGuess = (roomId, socketId, guess) => {
    const room = getRoom(roomId);

    if (!room) {
        return { success: false, error: 'Room not found' };
    }

    if (!room.gameStarted) {
        return { success: false, error: 'Game not started' };
    }

    if (room.currentDrawer === socketId) {
        return { success: false, error: 'Drawer cannot guess' };
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = room.word.trim().toLowerCase();

    if (normalizedGuess === normalizedWord) {

        const player = room.players.find(p => p.socketId === socketId);

        if (!player) {
            return { success: false, error: 'Player not found in room' };
        }

        // prevent double scoring
        if (room.guessedPlayers.includes(socketId)) {
            return { success: false, error: 'Already guessed correctly' };
        }

        const points = 10 - (room.guessedPlayers.length * 2);
        player.score += Math.max(points, 5);
        room.guessedPlayers.push(socketId);

        const totalGuessers = room.players.length - 1; // exclude drawer
        const allGuessed = room.guessedPlayers.length === totalGuessers;

        if (allGuessed) {
            room.gameStarted = false;

            return {
                success: true,
                correct: true,
                roundComplete: true,
                word: room.word,
                players: room.players
            };
        }

        return {
            success: true,
            correct: true,
            roundComplete: false,
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

    if (!room) {
        return { success: false, error: 'Room not found' };
    }

    if (room.players.length < 2) {
        return { success: false, error: 'Not enough players' };
    }

    // First time starting game
    if (!room.gameStarted) {
        room.gameStarted = true;
        room.round = 1;
        room.drawerIndex = 0;

        
        room.players.forEach(player => {
            player.score = 0;
        });

    } else {
        // Move to next drawer
        room.drawerIndex++;

        // If all players have drawn → new round
        if (room.drawerIndex >= room.players.length) {
            room.drawerIndex = 0;
            room.round++;
        }
    }

    // Stop if max rounds reached
    if (room.round > room.totalRounds) {
        room.gameStarted = false;

        return {
            success: true,
            gameOver: true,
            room
        };
    }

    const drawer = room.players[room.drawerIndex];
    room.currentDrawer = drawer.socketId;
    room.word = getRandomWord();
    room.guessedPlayers = [];

    return {
        success: true,
        gameOver: false,
        room
    };
};


module.exports = {
    handleGuess,
    startNextRound
};