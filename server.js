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
    NOT_FOUND: 404,
    FULL: 413,
}

const PORT = 3000;

class Game {
    constructor() {
        this.codenames = [...Array(25).keys()]
        // 4: assassin, 3: npc, 1: team 1 (-1 revealed), 2: team 2 (-2 revealed)
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
        let identities = this.trueIdentities
        if (!user.isSpymaster()) {
            identities.forEach((trueID, i) => {
                return trueID * this.revealedIdentities[i]
            })
        }
        return {
            codenames: this.codenames,
            identities: identities,
            startingTeam: this.startingTeam,
            turn: this.turn
        }
        
    }

    revealAgent(row, column) {
        this.revealedIdentities[row*5 + column] = 1
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
        this.gameLog = []
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

    getState() {
        let extractNames = function (team) {
            return {
                spymasters: team.spymasters.map(player => {
                    return player.username
                }),
                operatives: team.operatives.map(player => {
                    return player.username
                })
            }
        }
        return {
            host: this.host.username,
            gameStarted: this.gameStarted,
            team1: extractNames(this.teams[1]),
            team2: extractNames(this.teams[2]),
            spectators: this.teams[0].map(player => {
                return player.username
            }),
            gameLog: this.gameLog
        }
    }

    isFull() {
        return this.players.length >= this.maxSize
    }

    isHost(user) {
        return user == this.host
    }

    add(user) {
        if (this.isFull) {
            return false
        }
        // if (user in this.players) {
        //     console.log("USER IN ROOM")
        // }
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

    sendToRoom(event, ...message) {
        io.to(this.room.code).emit(event, ...message)
    }

    isSpymaster() {
        let spymasters = [...this.room.teams.one.spymasters, ...this.room.teams.two.spymasters]
        return spymasters.includes(this)
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
        this.sendToRoom("playerChangedName", this.username, username, this.room.getState())
        console.log(this.uuid, "changed name")
        this.username = username
    }

    joinRoom(roomCode, callback) {
        let room = Room.get(roomCode)
        if (room == undefined) {
            callback(RESPONSE_CODE.NOT_FOUND); return;
        }
        if (room.isFull()) {
            callback(RESPONSE_CODE.FULL); return;
        }
        this.room = room
        this.socket.join(roomCode)
        console.log(this.uuid, "joined room:", this.room.code)
        callback(RESPONSE_CODE.JOINED, room.isHost(this), room.getState(), room.game.getState(this))
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
        this.room?.remove(this)
    }

    hostStartedGame(callback) {
        callback(RESPONSE_CODE.OK)
        this.sendToRoom("startGame", this.room.game.getState(this))
    }

    sendMessage(message) {
        console.log(this.uuid, "sent message:", message)
        this.sendToRoom("playerSentMessage", this.username, message)
    }

    revealAgent(row, column) {
        this.room.game.revealAgent(row, column)
        this.sendToRoom("operativeGuessed", row, column, this.room.game.getState(this))
    }

    switchTeams(team, role) {
        for (let i = 0; i < 3; i++) {
            try {
                this.room.teams[i].spymasters.remove(this)
                this.room.teams[i].operatives.remove(this)
            } catch {
                this.room.teams[i].remove(this)
            }
        }
        if (team == 0) {
            this.room.teams[team].push(this)
        } else {
            this.room.teams[team][role].push(this)
        }
        this.sendToRoom("playerSwitchedTeams", this.room.getState())
    }
}

io.on('connection', (socket) => {
    let uuid = socket.handshake.query.uuid
    User.register(socket)

    socket.on('disconnecting', () => {
        if (socket.rooms.length > 1) {
            io.to(socket.rooms[1]).emit("playerLeft", User.get(uuid).username)
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