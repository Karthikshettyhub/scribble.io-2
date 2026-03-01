const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();
const socketManager = require('./sockets/socketManager');
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server,{
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

socketManager(io);

app.get('/',(req,res)=>{
    res.send('Hello World');
});

const PORT = process.env.PORT || 5001;

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});