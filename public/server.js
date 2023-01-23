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

const crypto = require("crypto")

const RESPONSE_CODE = {
    ROOM_NOT_FOUND: 0,
    ROOM_FULL: 1,

}

class Room {

    static rooms = {}
    static maxSize = 6

    constructor(hostUser, roomCode) {
        this.players = [hostUser]
        this.code = roomCode
    }

    static create(hostUser) {
        let roomCode;
        while (this.rooms[roomCode = crypto.randomBytes(2).toString("hex").toUpperCase()]);
        this.rooms[roomCode] = new Room(hostUser, roomCode)
        return this.rooms[roomCode]
    }

    static get(roomCode) {
        return this.rooms[roomCode]
    }

    add(user) {
        if (this.players.length >= this.maxSize) {
            return false;
        }
        this.players.push(user);
        return true;
    }

    remove(uuid) {
        let removePlayerI;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].uuid == uuid) {
                removePlayerI = i
            }
        }
        // TODO REMOVE PLAYER
    }
}

class User {

    static users = {}

    constructor(socket) {
        this.bind(socket)
    }

    static register(socket) {
        let uuid = socket.handshake.query.uuid
        if (!this.users[uuid]) {
            this.users[uuid] = new User(socket);
        }
    }

    static get(socket) {
        return this.users[socket.handshake.query.uuid]
    }

    bind(socket) {
        socket.onAny((event, ...args) => {
            try {
                if (typeof this[event] === "function") this[event](...args)
            } catch {
                socket.emit("error", "Invalid arguments")
            }
        })
        if (this.socket) {
            this.socket.offAny();
        }
        this.socket = socket
    }

    changeUsername(username) {
        this.username = username
    }

    joinRoom(roomCode, callback) {
        let room = Room.get(roomCode)
        if (room == undefined) {
            callback(RESPONSE_CODE.ROOM_NOT_FOUND); return;
        }
        if (!room.add(this.socket)) {
            callback(RESPONSE_CODE.ROOM_FULL); return;
        }
        this.room = room
        console.log("Joined room:", this.room.code)
    }

    createRoom() {
        this.room = Room.create(this)
        console.log("Created room:", this.room.code)
    }

    leaveRoom() {
        this.room.remove(this)
    }
}

io.on('connection', (socket) => {
    uuid = socket.handshake.query.uuid
    User.register(socket)

    socket.on('disconnect', () => {

        User.get(uuid).room.code
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});