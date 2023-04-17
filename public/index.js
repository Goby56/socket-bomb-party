import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

let mainInputDiv = $("#main-input")
let roomNameForm = $("#room-name-form");
let enterRoomButton = $("#enter-room");

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
        $("#enter-room").text("join room")
    } else {
        $("#enter-room").text("create room")
    }
})

enterRoomButton.on("click", event => {
    let data = getFormData(roomNameForm);
    socket.emit("changeUsername", data["username"]);
    if (enterRoomButton.text() == "create room") {
        socket.emit("createRoom", (responseCode, roomCode) => {
            console.log(responseCode, roomCode)
            enterRoom(roomCode);
        });
        return;
    }
    socket.emit("joinRoom", data["roomcode"], (responseCode) => {
        console.log(responseCode);
        enterRoom(roomCode);
    })
})

function enterRoom(roomCode) {
    window.location = "/room/" + roomCode
}