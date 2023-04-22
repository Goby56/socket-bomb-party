import { connectSocket } from "./auth.js"
let socket = connectSocket()
let roomNameForm = $("#room-name-form");
let submitButton = $("#submit-button")

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
        submitButton.text("join room")
    } else {
        submitButton.text("create room")
    }
})

submitButton.on("click", event => {
    let data = getFormData(roomNameForm);
    socket.emit("changeUsername", data["username"]);
    if (submitButton.text() == "create room") {
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

$(".available-room").on("click", event => {
    let data = getFormData(roomNameForm);
    socket.emit("changeUsername", data["username"]);
    let roomCode = $(event.currentTarget).children("#room-code-text").text()
    enterRoom(roomCode)
})

function enterRoom(roomCode) {
    window.location = "/room/" + roomCode
}