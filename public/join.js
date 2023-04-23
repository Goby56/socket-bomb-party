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
    // Changes button value to "join room" if room code is provided
    if (getFormData(roomNameForm)["roomcode"] != "") {
        submitButton.text("join room")
    } else {
        submitButton.text("create room")
    }
})

submitButton.on("click", event => {
    let data = getFormData(roomNameForm);
    socket.emit("changeUsername", data["username"], (responseCode) => {
        if (responseCode == 400) {
            // TODO BETTER NAME ERROR
            alert("Please provide an username")
            return;
        }
        if (submitButton.text() == "create room") {
            socket.emit("createRoom", (responseCode, roomCode) => {
                enterRoom(roomCode);
            });
            return;
        }
        socket.emit("existingRoom", data["roomcode"], (responseCode) => {
            if (responseCode == 404) {
                // TODO BETTER ERROR
                alert("Room doesn't exist")
                return;
            }
            enterRoom(data["roomcode"]);
        })
    });
    
})

$(".available-room").on("click", event => {
    let data = getFormData(roomNameForm);
    socket.emit("changeUsername", data["username"], (responseCode) => {
        if (responseCode == 400) {
            // TODO BETTER NAME ERROR
            alert("Please provide an username")
            return;
        }
        let roomCode = $(event.currentTarget).children("#room-code-text").text()
        enterRoom(roomCode)
    });
})

function enterRoom(roomCode) {
    window.location = "/room/" + roomCode
}