import { connectSocket } from "./auth.js"

let socket = connectSocket()

var ROOM_STATE = {
    host: "",
    gameStarted: false,
    team1: [],
    team2: [],
    spectators: [],
    gameLog: []
}

var GAME_STATE = {
    codenames: [],
    identities: [],
    turn: ""
}

function revealBoard(codenames) {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            $("#game-board").append(`
            <div class="agent-card" style="grid-area: ${r+1} / ${c+1} / ${r+2} / ${c+2};">
                <div class="agent-card-inner">
                    <div class="agent-card-front">
                        <p class="name-label1">Hello</p>
                        <p class="name-label2">my name is</p>
                        <p class="agent-codename">${codenames[r*5 + c]}</p>
                    </div>
                    <div class="agent-card-back">
                    </div>
                </div>
            </div>
            `)
        }
    }

    $(".agent-card").on("click", e => {
        let gridArea = $(e.currentTarget).css("grid-area").split("/")
        socket.emit("revealAgent", gridArea[0]-1, gridArea[1]-1)
    })
}

socket.emit("joinRoom", window.location.pathname.slice(-4), (responseCode, isHost, roomState, gameState) => {
    ROOM_STATE = roomState
    GAME_STATE = gameState
    socket.emit("switchTeams", 0, "spectator")
    if (isHost) {
        $("#host-settings").toggleClass("hide")
        $("#start-game").on("click", e => {
            socket.emit("hostStartedGame", responseCode => {
                $("#host-settings").toggleClass("hide")
            })
        })
    }
    if (roomState.gameStarted) {
        revealBoard(gameState.codenames)
    }
})

// ----- Chatting in the game log -----
$("#log-input").on("submit", e => {
    e.preventDefault()
    socket.emit("sendMessage", $("#log-input-field").val());
    $("#log-input-field").val("");
})

socket.on("playerSentMessage", (sender, message) => {
    $("#log-contents").append(`<p>${sender}: ${message}</p>`)
})
socket.on("startGame", gameState => {
    GAME_STATE = gameState
    $("#log-contents").append(`<p>game started!</p>`)
    revealBoard(GAME_STATE.codenames)
})
socket.on("playerJoined", (username, roomState) => {
    $("#log-contents").append(`<p>${username} joined</p>`)
    ROOM_STATE = roomState
})
socket.on("playerLeft", (username, roomState) => {
    $("#log-contents").append(`<p>${username} left</p>`)
    ROOM_STATE = roomState
})
socket.on("playerChangedName", (prevName, newName, roomState) => {
    $("#log-contents").append(`<p>${prevName} changed name to ${newName}</p>`)
    ROOM_STATE = roomState
})

// ----- Team switching -----
$("join-team1-operative").on("click", e => { socket.emit("switchTeams", 1, "operative") })
$("join-team1-spymaster").on("click", e => { socket.emit("switchTeams", 1, "spymaster") })
$("join-team2-operative").on("click", e => { socket.emit("switchTeams", 2, "operative") })
$("join-team2-spymaster").on("click", e => { socket.emit("switchTeams", 2, "spymaster") })

socket.on("playerSwitchedTeam", (roomState) => {
    ROOM_STATE = roomState
})

socket.on("operativeGuessed", (row, column, gameState) => {
    $($(".agent-card-inner").toArray()[row*5 + column]).toggleClass("flip")
    GAME_STATE = gameState
    // applyState()
})

function applyState() {
    let cards = $(".agent-card-inner").toArray()
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            let id = GAME_STATE.identities[r*5 + c]
            let card = $(cards[r*5 + c])
            console.log(card, id)
            if (id == 0) return;
            if (id < 0) {
                
            }
            if (!card.hasClass("flip")) {
                card.toggleClass("flip")
            }

        }
    }
}




