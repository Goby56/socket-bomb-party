import { connectSocket } from "./auth.js"

let socket = connectSocket()

socket.emit("joinRoom", window.location.pathname.slice(-4), (responseCode) => {
    console.log(responseCode)
})

let gameBoard = $("#game-board")

for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
        gameBoard.append(`
        <div class="agent-card" style="grid-area: ${r+1} / ${c+1} / ${r+2} / ${c+2};">
            <div class="agent-card-inner">
                <div class="agent-card-front">
                    <p class="name-label1">Hello</p>
                    <p class="name-label2">my name is</p>
                    <p class="agent-codename">${r} / ${c}</p>
                </div>
                <div class="agent-card-back">
                    <img src="/images/agents/${r*c + c}" alt="">
                </div>
            </div>
        </div>
        `)
    }
}

$("#-reveal-all").on("click", e => {
    $(".agent-card-inner").toggleClass("flip")
})
