import { connectSocket } from "./auth.js"

let socket = connectSocket()

function updateTeams(playerList) {
    [
        "#team1-operative", "#team1-spymaster",
        "#team2-operative", "#team2-spymaster",
        "#spectators"
    ].forEach(selector => {
        $(selector).empty()
    })
    playerList.forEach(player => {
        let selector;
        let element;
        if (player.role[0] == 0) {
            selector = "#spectators"
        } else {
            selector = `#team${player.role[0]}-${player.role[1]}`
        }
        if (player.isHost) {
            element = `<p><img class="host-badge" src="/images/host.png">${player.username}</p>`
        } else {
            element = `<p>${player.username}</p>`
        }
        $(selector).append(element)
    })
}

function updateState(state) {
    if (state.gameStarted) {
        if (state.team) {
            $(".join-team-button").toArray().forEach(button => {
                let btn = $(button)
                if (!btn.hasClass("hide")) {
                    btn.toggleClass("hide")
                }
            })
        }
        revealIdentities(state.identities)
    }
}

function revealIdentities(identities) {
    console.log(identities)
    let cards = $(".agent-card-inner").toArray()
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            let id = identities[r*5 + c]
            let card = $(cards[r*5 + c])
            if (id == 0) return;
            if (id < 0) {
                // TODO IMPLEMENT REVEALED CARDS
                if (!card.hasClass("flip")) {
                    card.toggleClass("flip")
                }
            } else if (id > 0) {
                let cardFront = $(card.children(".agent-card-front"))
                cardFront.removeClass("team1 team2 assasin")
                if (id == 1) {
                    cardFront.addClass("team1")
                } else if (id == 2) {
                    cardFront.addClass("team2")
                } else if (id == 4) {
                    cardFront.addClass("assassin")
                }
                // TODO IMPLEMENT SPYMASTER VIEW
            }
        }
    }
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

socket.emit("joinRoom", window.location.pathname.slice(-4), (responseCode, isHost, state, playerList) => {
    console.log(responseCode)
    if (responseCode != 302) {
        window.location = "/"
        alert("An error occured joining the room")
    }
    if (isHost & !state.gameStarted) {
        $("#host-settings").toggleClass("hide")
        $("#start-game").on("click", e => {
            socket.emit("startGame", responseCode => {
                $("#host-settings").toggleClass("hide")
            })
        })
    }    
    if (state.gameStarted) {
        revealBoard(state.codenames)
    }
    updateTeams(playerList)
    updateState(state)
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
socket.on("hostStartedGame", state => {
    $("#log-contents").append(`<p>game started!</p>`)
    revealBoard(state.codenames)
    updateState(state)
})
socket.on("playerJoined", (username, playerList) => {
    $("#log-contents").append(`<p>${username} joined</p>`)
    updateTeams(playerList)
})
socket.on("playerLeft", (username, playerList) => {
    $("#log-contents").append(`<p>${username} left</p>`)
    updateTeams(playerList)
})
socket.on("playerChangedName", (prevName, newName, playerList) => {
    $("#log-contents").append(`<p>${prevName} changed name to ${newName}</p>`)
    updateTeams(playerList)
})

// ----- Team switching -----
function joinTeam(team, role, gameStarted) {
    socket.emit("switchTeams", team, role, gameStarted => {
        if (gameStarted) {
            $(".join-team-button").toArray().forEach(button => {
                let btn = $(button)
                if (!btn.hasClass("hide")) {
                    btn.toggleClass("hide")
                }
            })
        }
    })
} 

$("#join-team1-operative").on("click", e => { joinTeam(1, "operative") })
$("#join-team1-spymaster").on("click", e => { joinTeam(1, "spymaster") })
$("#join-team2-operative").on("click", e => { joinTeam(2, "operative") })
$("#join-team2-spymaster").on("click", e => { joinTeam(2, "spymaster") })

socket.on("playerSwitchedTeam", playerList => {
    updateTeams(playerList)
})

// ----- Guessing -----
socket.on("operativeGuessed", (row, column, state) => {
    $($(".agent-card-inner").toArray()[row*5 + column]).toggleClass("flip")
    updateState(state)
})
