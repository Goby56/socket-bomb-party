// Setup
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

// Socket.io
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
}); 

io.on('connection', (socket) => {
    socket.broadcast.emit("user connection", socket.id)

	socket.on('disconnect', () => {
        socket.broadcast.emit("user disconnection", socket.id)
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg)
    });

    socket.on("someone typing", (username) => {
        io.emit("someone typing", username)
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});