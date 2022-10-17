var socket = io.connect('http://localhost:3000/');

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var typingDiv = document.getElementById("typingDiv")

var username = prompt("Choose a username: ")


// Handle chat input
form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value) {
        message = `${username}: ${input.value}`
        socket.emit('chat message', message);
        input.value = '';
    }
});

input.addEventListener('input', () => {
    socket.emit("someone typing", username)
})

// Add message html
socket.on('chat message', (msg) => {
    appendToChat(msg)
});
socket.on("user connection", (userID) => {
    appendToChat(userID + " connected.")
}) 
socket.on("user disconnection", (userID) => {
    appendToChat(userID + " disconnected.")
})
socket.on("someone typing", (username) => {
    typingDiv.innerHTML = username
    console.log(username)
})


// Add item to html list
function appendToChat(content) {
    var item = document.createElement('li');
    item.textContent = content;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
}