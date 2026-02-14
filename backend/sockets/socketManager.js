
const socketManager =(io) => {
    io.on('connection',(socket) => {
        console.log("user connected: ", socket.id);

        //create-room
        socket.on('create-room',(data)=>{
           console.log("room creation request",data);
        });
        //join room
        socket.on('join-room',(data)=>{
            console.log("join room request",data);
        });
        //leave room
        socket.on('leave-room',(data)=>{
            console.log("user left the room",data);
        });
        
    });
};

module.exports = socketManager;