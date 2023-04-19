import { connectSocket } from "./auth.js"
let socket = connectSocket()

let mainInputDiv = $("#main-input")
let roomNameForm = $("#room-name-form");
let enterRoomButton = $("#enter-room");

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
    socket.emit("existingRoom", data["roomcode"], (responseCode) => {
        console.log(responseCode);
        if (responseCode == 302) {
            enterRoom(data["roomcode"]);
        }
    })
})

function enterRoom(roomCode) {
    window.location = "/room/" + roomCode
}