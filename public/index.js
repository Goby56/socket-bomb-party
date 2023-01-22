import { v4 as uuidv4 } from 'uuid';

// let loginPrompt = $("#login-prompt")
let roomNameForm = $("#room-name-form");
let gameContainer = $("#game-container");

function getUuid() {
    let uuid = window.localStorage.getItem("uuid")
    if (!uuid) {
        uuid = uuidv4()
        window.localStorage.setItem("uuid", uuid)
    }
    return uuid;
}

let socket = io({
    query: {
        uuid: getUuid()
    }
});

// change click keyup input paste
roomNameForm.on("input", event => {
    let data = {}
    roomNameForm.serialize().split("&").forEach(element => {
        let [key, value] = element.split("=")
        data[key] = value
    })
    socket.emit("changeUsername", data["username"])
    socket.emit("joinRoom", data["roomcode"], (responseCode) => {
        console.log(responseCode)
    })
    
})
// roomNameForm.addEventListener("submit", e => {
//     e.preventDefault();
//     username = roomNameForm.username
//     if (!username) {
//         username = `Per${Math.round(Math.random*100)}` // Randomize name if no were given
//     }
//     socket.username = username
//     socket.emit("joinRoom", roomNameForm.roomCode, (responseCode) => {
//         if (responseCode == 1) {
//             loginPrompt.classList.add("hide")
//             gameContainer.classList.remove("hide")
//         } else if (responseCode == 0) {
//             roomNameForm.enterRoom.value = 
//         }
        
//     })

// })

// var messages = document.getElementById('messages');
// var form = document.getElementById('form');
// var input = document.getElementById('input');
// var typingDiv = document.getElementById("typingDiv")

// var peopleTyping = []


// // Handle chat input
// form.addEventListener('submit', function(e) {
//     e.preventDefault();
//     if (input.value) {
//         message = `${username}: ${input.value}`
//         socket.emit('chat message', message);
//         input.value = '';
//         socket.emit("stopped typing", username)
//     }
// });

// input.addEventListener('input', () => {
//     if (input.value) {
//         socket.emit("typing", username)
//     } else {
//         socket.emit("stopped typing", username)
//     }
// })

// // Add message html
// socket.on('chat message', (msg) => {
//     appendToChat(msg)
// });
// socket.on("user connection", (userID) => {
//     appendToChat(userID + " connected.")
// }) 
// socket.on("user disconnection", (userID) => {
//     appendToChat(userID + " disconnected.")
// })
// socket.on("typing", (username) => {
//     if (!peopleTyping.includes(username)) {
//         peopleTyping.push(username)
//     }
//     updateTypingStatus(peopleTyping)
// })
// socket.on("stopped typing", (username) => {
//     if (peopleTyping.includes(username)) {
//         index = peopleTyping.find(username)
//         peopleTyping.pop(index)
//     }
//     updateTypingStatus(peopleTyping)
// })


// // Add item to html list
// function appendToChat(content) {
//     var item = document.createElement('li');
//     item.textContent = content;
//     messages.appendChild(item);
//     window.scrollTo(0, document.body.scrollHeight);
// }

// // Update typing div
// function updateTypingStatus(peopleTyping) {
//     if (peopleTyping.length > 2) {
//         typingDiv.innerHTML = `${peopleTyping[0]}, ${peopleTyping[1]}, +${peopleTyping.length-2}...`
//     } else {
//         typingDiv.innerHTML = `${peopleTyping[0]}, ${peopleTyping[1]}...`
//     }
// }