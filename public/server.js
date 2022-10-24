// Setup
const express = require('express');
const app = express();

app.use(express.static('public'));

const http = require('http');
const server = http.createServer(app);

// Socket.io
const { Server } = require("socket.io");
const io = new Server(server);

// app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
}); 

var users = {}
var peopleTyping = []



io.on('connection', (socket) => {
    socket.on("username handshake", (username) => {
        users[socket.id] = username
    })
    socket.broadcast.emit("user connection", username)

	socket.on('disconnect', () => {
        socket.broadcast.emit("user disconnection", username)
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg)
    });

    socket.on("started typing", (username) => {
        
        io.emit("people typing", username)
    })

    socket.on("stopped typing", (username) => {
        io.emit("stopped typing", username)
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});