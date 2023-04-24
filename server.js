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

const fs = require('fs');

let agentImages = fs.readdirSync("public/images/agents");

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
        this.trueIdentities = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4]
        this.revealedIdentities = new Array(25).fill(0)
        this.startingTeam = crypto.randomInt(2) + 1
        this.trueIdentities.push(this.startingTeam)
        this.agentImages = agentImages
        // Shuffle board
        for (let i = 25 - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.trueIdentities[i], this.trueIdentities[j]] = [this.trueIdentities[j], this.trueIdentities[i]];
            [this.agentImages[i], this.agentImages[j]] = [this.agentImages[j], this.agentImages[i]];
        }
        this.turn = this.startingTeam
    }

    getState(user) {
        let images = Array(25).fill("")
        let identities = this.trueIdentities.map((trueID, i) => {
            if (!user.isSpymaster()) {
                if (this.revealedIdentities[i]) {
                    images[i] = this.agentImages[i];
                }
                return trueID * this.revealedIdentities[i]; // Mask
            }
            images[i] = this.agentImages[i];
            return trueID;
        })
        return {
            codenames: this.codenames,
            identities: identities,
            agentImages: images,
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
                role: player.role[player.room.code],
                isHost: player.isHost()
            }
        })
    }

    getState(user) {
        let currRoom = user.room.code
        return {
            gameStarted: this.gameStarted,
            team: user.role[currRoom][0],
            role: user.role[currRoom][1],
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
        this.role = {}
        // this.role = [0, "spectator"] // [<0-2>, <"spectator"|"operative"|"spymaster"]
    }

    static register(socket) {
        let uuid = socket.handshake.query.uuid
        if (!this.users[uuid]) {
            this.users[uuid] = new User(socket);
        }
        this.users[uuid].bind(socket)
    }

    /**
     * Provide atleast one of the arguments and a User will be returned
     * if the given user exists
     * @param {string} uuid 
     * @param {socket} socket 
     * @param {string} socketID 
     * @returns 
     */
    static get(uuid = undefined, socket = undefined, socketID = undefined) {
        if (uuid) {
            return this.users[uuid]
        }
        if (socket) {
            return this.users[socket.handshake.query.uuid]
        }
        if (socketID) {
            let socket = io.sockets.sockets.get(socketID)
            return this.users[socket.handshake.query.uuid]
        }
    }

    /**
     * If the object {includeState: true} is present as additional 
     * data the message will be sent out indiviually to each user 
     * with that user's given state
     * @param {*} event 
     * @param  {...any} data 
     */
    sendToRoom(event, ...data) {
        let includeState = data.some((param, i) => {
            if (param.includeState) {
                data.splice(i)
                return true
            }
        })
       
        if (includeState) {
            this.room.players.forEach(user => {
                user.send(event, ...data, this.room.getState(user))
            })
        } else {
            io.to(this.room.code).emit(event, ...data)
        }
    }

    send(event, ...message) {
        io.to(this.socket.id).emit(event, ...message)
    }

    isSpymaster() {
        return this.role[this.room.code][1] == "spymaster"
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
        if (!this.role[this.room.code]) {
            this.role[this.room.code] = [0, "spectator"]
        }
        callback(RESPONSE_CODE.FOUND, this.isHost(), room.getState(this), this.room.getPlayerList()); 
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
        this.sendToRoom("hostStartedGame", {includeState: true})
    }

    sendMessage(message) {
        console.log(this.uuid, "sent message:", message)
        this.sendToRoom("playerSentMessage", this.username, message)
    }

    revealAgent(row, column) {
        if (this.room.game.revealAgent(row, column)) {
            this.sendToRoom("operativeGuessed", row, column, {includeState: true})
        }
    }

    switchTeams(team, role, callback) {
        let prevRole = this.role[this.room.code]
        if (this.room.gameStarted & prevRole[0] != 0) {
            return; // If game has started and player has already chosen role
        }
        if (prevRole[0] == team & prevRole[1] == role) {
            return; // If player did not change role
        }

        this.role[this.room.code] = [team, role]
        if (team) {
            this.sendToRoom("playerSwitchedTeam", this.room.getPlayerList())
            callback(this.room.gameStarted, this.room.getState(this))
        }
    }

    fetchUsername(callback) {
        if (this.username) {
            callback(this.username)
        }
    }
}

io.on('connection', (socket) => {
    let uuid = socket.handshake.query.uuid
    User.register(socket)

    socket.on('disconnecting', () => {
        if (socket.rooms.size > 1) {
            User.get(uuid).leaveRoom()
        }
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