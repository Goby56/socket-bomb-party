let loginPrompt = document.querySelector("#login-prompt")
let roomNameForm = loginPrompt.querySelector("#room-name-form")

roomNameForm.addEventListener("submit", e => {
    e.preventDefault();
    username = roomNameForm.username
    roomCode = roomNameForm.roomCode
    if (!username) {
        username = `Per${Math.round(Math.random*100)}` // Randomize name if no were given
    }
    let socket = io({
        auth: {
            name: username,
        }
    });

})