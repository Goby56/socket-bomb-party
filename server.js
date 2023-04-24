// Setup
const express = require('express');
const app = express();

app.use(express.static("public"));

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

const crypto = require("crypto") // Used to generate random room codes

const RESPONSE_CODE = {
    OK: 200,
    CREATED: 201,
    FOUND: 302,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    FULL: 413,
}

const PORT = 3000;

class Game {
    constructor() {
        this.codenames = [...Array(25).keys()]
        // 4: assassin, 3: npc, 1: team 1, 2: team 2, negative values are revealed cards
        this.trueIdentities = [4, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2]
        this.revealedIdentities = new Array(25).fill(0)
        this.startingTeam = crypto.randomInt(2) + 1
        this.trueIdentities.push(this.startingTeam)
        for (let i = this.trueIdentities.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.trueIdentities[i], this.trueIdentities[j]] = [this.trueIdentities[j], this.trueIdentities[i]]
        }
        this.turn = this.startingTeam
    }

    getState(user) {
        let identities = this.trueIdentities.map((trueID, i) => {
            if (!user.isSpymaster()) {
                return trueID * this.revealedIdentities[i] // Mask
            }
            return trueID
        })
        // console.log(user.username, identities)
        return {
            codenames: this.codenames,
            identities: identities,
            startingTeam: this.startingTeam,
            turn: this.turn
        }
        
    }

    revealAgent(row, column) {
        if (this.revealedIdentities[row*5 + column]) {
            return false;
        }
        this.revealedIdentities[row*5 + column] += 1
        this.trueIdentities[row*5 + column] *= -1 
        return true;
    }
}

class Room {

    static rooms = {}
    static maxSize = 6

    constructor(hostUser, roomCode) {
        this.players = [hostUser]
        this.code = roomCode
        this.host = hostUser
        this.gameStarted = false
        this.teams = [
            [],
            { spymasters: [], operatives: [] },
            { spymasters: [], operatives: [] }
        ]
        this.game = new Game()
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

    getPlayerList() {
        return this.players.map(player => {
            return {
                username: player.username,
                role: player.role,
                isHost: player.isHost()
            }
        })
    }

    getState(user) {
        return {
            gameStarted: this.gameStarted,
            team: user.role[0],
            role: user.role[1],
            ...this.game.getState(user)
        }
    }

    isFull() {
        return this.players.length >= this.maxSize
    }

    addUser(user) {
        if (this.isFull()) {
            return false
        }
        if (this.players.includes(user)) {
            return true
        }
        this.players.push(user);
        user.room = this
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
        this.role = [0, "spectator"] // [<0-2>, <"spectator"|"operative"|"spymaster"]
    }

    static register(socket) {
        let uuid = socket.handshake.query.uuid
        if (!this.users[uuid]) {
            this.users[uuid] = new User(socket);
        }
        this.users[uuid].bind(socket)
    }

    static get(uuid = undefined, socket = undefined, socketID = undefined) {
        if (uuid) {
            return this.user[uuid]
        }
        if (socket) {
            return this.users[socket.handshake.query.uuid]
        }
        if (socketID) {
            let socket = io.sockets.sockets.get(socketID)
            return this.users[socket.handshake.query.uuid]
        }
    }

    sendToRoom(event, ...message) {
        io.to(this.room.code).emit(event, ...message)
    }

    isSpymaster() {
        return this.role[1] == "spymaster"
    }

    isHost() {
        return this == this.room.host
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

    changeUsername(username, callback) {
        if (!username) {
            callback(RESPONSE_CODE.BAD_REQUEST); return;
        }
        let prevName = this.username
        this.username = username
        console.log(this.uuid, "changed name")
        if (this.room) {
            if (username != prevName) {
                this.sendToRoom("playerChangedName", prevName, username, this.room.getPlayerList())
            } 
        }
        callback(RESPONSE_CODE.OK);
    }

    joinRoom(roomCode, callback) {
        let room = Room.get(roomCode)
        if (room == undefined) {
            callback(RESPONSE_CODE.NOT_FOUND); return;
        }
        if (!room.addUser(this)) {
            callback(RESPONSE_CODE.FULL); return;
        }
        this.socket.join(roomCode)
        console.log(this.uuid, "joined room:", room.code)
        this.switchTeams(0, "spectator")
        callback(RESPONSE_CODE.FOUND, this.isHost(), room.getState(this), this.room.getPlayerList()); 
        // TODO maybe remove sending player list in callback
        this.sendToRoom("playerJoined", this.username, this.room.getPlayerList()) 
    }

    createRoom(callback) {
        this.room = Room.create(this)
        callback(RESPONSE_CODE.CREATED, this.room.code)
        console.log(this.uuid, "created room:", this.room.code)
    }

    existingRoom(roomCode, callback) {
        let room = Room.get(roomCode)
        if (!room) {
            callback(RESPONSE_CODE.NOT_FOUND); return;
        }
        if (!room.isFull) {
            callback(RESPONSE_CODE.FULL); return;
        }
        callback(RESPONSE_CODE.FOUND)
    }

    leaveRoom() {
        console.log(this.uuid, "leaved room:", this.room.code)
        this.room
        this.room?.remove(this)
        this.socket.leave(this.room.code)
        this.sendToRoom("playerLeft", this.username, this.room.getPlayerList())
    }

    startGame(callback) {
        callback(RESPONSE_CODE.OK)
        this.room.gameStarted = true
        // console.log(Object.keys(User.users))
        io.sockets.adapter.rooms.get(this.room.code).forEach(id => {
            this.sendToRoom("hostStartedGame", this.room.getState(User.get(socketID=id)))
            // THIS BROKEY TODO FIX
        })
        // for (let uuid of Object.keys(User.users)) {
        //     // console.log("sending started game to", User.get(uuid).username)
            
        //     this.sendToRoom("hostStartedGame", this.room.getState(User.get(uuid)))
        // }
    }

    sendMessage(message) {
        console.log(this.uuid, "sent message:", message)
        this.sendToRoom("playerSentMessage", this.username, message)
    }

    revealAgent(row, column) {
        if (this.room.game.revealAgent(row, column)) {
            this.sendToRoom("operativeGuessed", row, column, this.room.getState(this))
        }
    }

    switchTeams(team, role, callback) {
        if (this.room.gameStarted & this.role[0] != 0) {
            return;
        }
        this.role = [team, role]
        if (team) {
            this.sendToRoom("playerSwitchedTeam", this.room.getPlayerList())
            callback(this.room.gameStarted)
        }
    }
}

io.on('connection', (socket) => {
    let uuid = socket.handshake.query.uuid
    User.register(socket)
    // TODO socket recognition to save previous name

    socket.on('disconnecting', () => {
        if (socket.rooms.size > 1) {
            User.get(uuid).leaveRoom()
        }
        // io.to(socket.rooms)
        // User.get(uuid).leaveRoom()
    });
});

server.listen(PORT, () => {
    console.log(`server on localhost:${PORT}`);
});

// app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.render("join.html", {
        rooms: Object.values(Room.rooms).map(room => {
            return {
                players: room.players.length,
                code: room.code
            }
        })
    });
}); 

app.get("/room/:roomCode", (req, res) => {
    res.render("room.html", req.params)
})