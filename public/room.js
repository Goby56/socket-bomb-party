import { connectSocket } from "./auth.js"
let socket = connectSocket()

socket.emit("joinRoom", window.location.pathname.slice(-4), (responseCode) => {
    console.log(responseCode)
})

let gameBoard = $("#game-board")

for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) {
        gameBoard.append(`
        <div class="agent-card" style="grid-area: ${r} / ${c} / ${r+1} / ${c+1};">
            <div class="agent-card-inner">
                <div class="agent-card-front">
                    <p>${r}-${c}</p>
                </div>
                <div class="agent-card-back">
                    <img src="/images/agents/parick-bateman.jpg" alt="">
                </div>
            </div>
        </div>
        `)
    }
}