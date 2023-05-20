import { connectSocket } from "./auth.js"

let socket = connectSocket()

function updateTeams(playerList) {
    let teamSelectors = [
        "#team1-operative", "#team1-spymaster",
        "#team2-operative", "#team2-spymaster",
        "#spectators"
    ]
    teamSelectors.forEach(selector => {
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
        teamSelectors.splice(teamSelectors.indexOf(selector), 1)
        if (player.isHost) {
            element = `<p><img class="host-badge" src="/images/host.png">${player.username}</p>`
        } else {
            element = `<p>${player.username}</p>`
        }
        $(selector).append(element)
    })
    if (teamSelectors.length == 0 || 
        (teamSelectors.length == 1 && teamSelectors[0] == "#spectators")) {
            $("#status-indicator").text("Waiting for host to start . . .")
    } else if (playerList.length >= 4) {
        $("#status-indicator").text("Both teams need atleast two players . . . ")
    }

    // console.log(playerList)
}

function updateState(state) {
    console.log(state)
    if (state.gameStarted) {
        let roleName = state.turn[1].replace(state.turn[1][0], state.turn[1][0].toUpperCase()) + "s"
        if (!state.gameOver) {
            $("#status-indicator").text(`Team ${state.turn[0]}\n${roleName}!`)
        } else {
            $("#status-indicator").text(`Team ${state.winner}\nwinner!`)
        }
        revealIdentities(state.identities, state.agentImages)
        if (state.team) {
            // If player has a team, hide button to join other teams when game is started
            $(".join-team-button").toArray().forEach(button => {
                let btn = $(button)
                if (!btn.hasClass("hide")) {
                    btn.toggleClass("hide")
                }
            })
        }
        // if (state.team == state.turn[0]) {
        //     if (state.role == "spymaster" && state.turn[1] == "spymaster") {
        //         $("#spymaster-clue-container").removeClass("hide")
        //     } 
        // }
        if (state.turn[1] == "spymaster") {
            if (!$("#general-clue-view").hasClass("hide")) {
                $("#general-clue-view").addClass("hide")
            }
            if (state.role == "spymaster" && state.team == state.turn[0]) {
                $("#clue-giving-view").removeClass("hide")
            } else {
                if (!$("#clue-giving-view").hasClass("hide")) {
                    $("#clue-giving-view").addClass("hide")
                }
            }
        } else {
            $("#general-clue-view").removeClass("hide")
            $("#clue-text").text(state.clue[0])
            $("#referenceCount-text").text(state.clue[1])
            if (!$("#clue-giving-view").hasClass("hide")) {
                $("#clue-giving-view").addClass("hide")
            }
            if (state.role == "operative" && state.team == state.turn[0]) {
                $("#end-guessing-button").removeClass("hide")
            }
        }
        if (state.role == "spymaster" && state.turn[1] == "spymaster" && 
            state.team == state.turn[0]) {
        } else {
            if (!$("#spymaster-clue-container").hasClass("hide")) {
                $("#spymaster-clue-container").addClass("hide")
            }
        }
        $("#team1-agents-left").text(state.agentsLeft[0])
        $("#team2-agents-left").text(state.agentsLeft[1])
    }
}

function revealIdentities(identities, images) {
    let cards = $(".agent-card-inner").toArray()
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            let id = identities[r*5 + c]
            let card = $(cards[r*5 + c])
            if (id == 0) continue;
            if (id < 0) {
                let cardBack = $(card.children(".agent-card-back"))
                cardBack.empty()
                cardBack.append(`<img src="/images/agents/${images[r*5 + c]}">`)
                if (!card.hasClass("flip")) {
                    card.addClass("flip")
                }
                cardBack.removeClass("team1 team2 assasin")
                if (id == -1) {
                    cardBack.addClass("team1")
                } else if (id == -2) {
                    cardBack.addClass("team2")
                } else if (id == -4) {
                    cardBack.addClass("assassin")
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

function getCodename(row, column) {
    return $($(".agent-card-inner").toArray()[row*5 + column]).find(".agent-codename").text()
}

socket.emit("joinRoom", window.location.pathname.slice(-4), (responseCode, isHost, state, playerList) => {
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
function joinTeam(team, role) {
    socket.emit("switchTeams", team, role, (gameStarted, state) => {
        updateState(state)
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

$("#randomize-teams").on("click", e => socket.emit("randomizeTeams"))
$("#reset-teams").on("click", e => socket.emit("resetTeams"))

socket.on("playerSwitchedTeam", playerList => {
    updateTeams(playerList)
})

// ----- Gameplay -----
$("#give-clue-button").on("click", e => {
    let clue = $("#clue-input-field").val()
    let referenceCount = $("#referenceCount-selection").val()
    socket.emit("giveClue", clue, referenceCount)
})

$("#end-guessing-button").on("click", e => {
    socket.emit("endGuessing")
})

socket.on("operativeGuessed", (row, column, state) => {
    $("#log-contents").append(`<p>${state.username} guesses ${getCodename(row, column)}</p>`)
    updateState(state)
})

socket.on("operativeEndedGuessing", (username, state) => {
    $("#log-contents").append(`<p>${username} ended guessing</p>`)
    updateState(state)
})

socket.on("guessingLimitReached", state => {
    // TODO TEAM BASED COLORS ON LOG ENTRIES
    $("#log-contents").append(`<p>No more guesses left</p>`)
})

socket.on("spymasterGaveClue", (clue, referenceCount, state) => {
    $("#log-contents").append(`<p>${state.username} gave the clue ${clue} ${referenceCount}</p>`)
    updateState(state)
})

socket.on("gameOver", (winner, state) => {
    $("#log-contents").append(`<p>Team ${winner} won!</p>`)
})
