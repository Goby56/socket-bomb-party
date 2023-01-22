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

let rooms = {}

class User {

    static users = {}

    constructor(socket) {
        this.socket = socket
        this.bind(socket)
    }

    static register(socket) {
        let uuid = socket.handshake.query.uuid
        if (!this.users.hasOwnProperty(uuid)) {
            this.users[uuid] = new User(socket);
        }
    }

    static get(socket) {
        return this.users[socket.handshake.query.uuid]
    }

    bind(socket) {
        socket.onAny((event, ...args) => {
            console.log(event)
            try {
                if (typeof this[event] === "function") this[event](...args)
            } catch {
                socket.emit("error", "Invalid arguments")
            }
        })
        // if (this.socket) {
        //     this.socket.offAny();
        // }
        // this.socket = socket
    }

    unbind() {
        if (this.socket) {
            this.socket.offAny();
        }
    }

    changeUsername(username) {
        this.username = username
    }

    joinRoom(roomCode, callback) {
        console.log(uuid)
        if (roomCode in rooms) {
            callback(1)
        } else {
            callback(0)  
        }
    }
}

io.on('connection', (socket) => {
    uuid = socket.handshake.query.uuid
    User.register(socket)

    socket.on('disconnect', () => {
        User.get(socket).unbind()
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});