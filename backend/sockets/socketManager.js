const { createRoom,joinRoom,leaveRoom,getRoom } = require('../controllers/roomManager');


const socketManager =(io) => {
    const userRoomMap = {};

    io.on('connection',(socket) => {

        console.log("user connected: ", socket.id);


        //create-room
        socket.on('create-room',({roomId,username})=>{

            const player = {
            socketId: socket.id,
            username,
            score: 0
          }
            const result = createRoom(roomId,player);

            if(!result.success){
                return socket.emit('error',{message: result.message});
            }

            socket.join(roomId);
            userRoomMap[socket.id] = roomId;

            socket.emit('room-created', result.room);
        });


        //join room
        socket.on('join-room',({roomId,username})=>{
            const player = {
                socketId: socket.id,
                username,
                score:0
            }

            const result = joinRoom(roomId,player);

            if(!result.success){
                return socket.emit('error',{message: result.message});
            }

            socket.join(roomId);
            userRoomMap[socket.id] = roomId;

            io.to(roomId).emit('room-updated',result.room);

        });


        //leave room
        socket.on('leave-room',()=>{
            const roomId = userRoomMap[socket.id];

            if(!roomId){
                return;
            }

            leaveRoom(roomId,socket.id);
            socket.leave(roomId);

            const updateRoom = getRoom(roomId);

            if(updateRoom){
                io.to(roomId).emit('room-updated',updateRoom);
            }

             delete userRoomMap[socket.id];
           
        });

        //disconnect
        
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

        
    });
};

module.exports = socketManager;