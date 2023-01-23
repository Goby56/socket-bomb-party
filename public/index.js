import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

// let loginPrompt = $("#login-prompt")
let roomNameForm = $("#room-name-form");
let enterRoomButton = $("#enter-room")
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

function getFormData(form) {
    let data = {};
    form.serialize().split("&").forEach(element => {
        let [key, value] = element.split("=");
        data[key] = value;
    })
    return data;
}

roomNameForm.on("change click keyup input paste", event => {
    // If room code is provided change button to join room
    if (getFormData(roomNameForm)["roomcode"] != "") {
        $("#enter-room").text("Join Room")
    } else {
        $("#enter-room").text("Create Room")
    }
})

enterRoomButton.on("click", event => {
    let data = getFormData(roomNameForm);
    socket.emit("changeUsername", data["username"]);
    if (enterRoomButton.text() == "Create Room") {
        socket.emit("createRoom");
        return;
    }
    socket.emit("joinRoom", data["roomcode"], (responseCode) => {
        console.log(responseCode);
    })
})