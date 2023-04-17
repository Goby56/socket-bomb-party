// Setup
const express = require('express');
const app = express();

app.use(express.static('public'));

const http = require('http');
const server = http.createServer(app);

//Template engine
const nunjucks = require('nunjucks')
nunjucks.configure('views', {
    autoescape: true,
    express: app
});

// Socket.io
const { Server } = require("socket.io");
const io = new Server(server);


// app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.render("join.html");
}); 

app.get("/room/:roomCode", (req, res) => {
    res.render("room.html", req.params)
})

const crypto = require("crypto") // Used to generate random room codes

const RESPONSE_CODE = {
    ROOM_NOT_FOUND: 404,
    ROOM_FULL: 413,
    ROOM_CREATED: 201,
    ROOM_JOINED: 200
}

const PORT = 3000;

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

    remove(user) {
        let indexToRemove;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].uuid == user.uuid) {
                indexToRemove = i
            }
        }
        this.players.splice(indexToRemove, 1)
    }
}

class User {

    static users = {}

    constructor(socket) {
        this.uuid = socket.handshake.query.uuid
    }

    static register(socket) {
        let uuid = socket.handshake.query.uuid
        if (!this.users[uuid]) {
            this.users[uuid] = new User(socket);
        }
        this.users[uuid].bind(socket)
    }

    static get(uuid) {
        return this.users[uuid]
    }

    bind(socket) {
        socket.onAny((event, ...args) => {
            console.log(event, ...args)
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
        console.log(this.uuid, "joined room:", this.room.code)
    }

    createRoom(callback) {
        this.room = Room.create(this)
        callback(RESPONSE_CODE.ROOM_CREATED, this.room.code)
        console.log(this.uuid, "created room:", this.room.code)
    }

    leaveRoom() {
        this.room?.remove(this)
    }
}

io.on('connection', (socket) => {
    let uuid = socket.handshake.query.uuid
    User.register(socket)

    socket.on('disconnect', () => {
        User.get(uuid).leaveRoom()
    });
});

server.listen(PORT, () => {
    console.log(`server on localhost:${PORT}`);
});