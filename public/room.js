import { connectSocket } from "./auth.js"
let socket = connectSocket()

socket.emit("joinRoom", window.location.pathname.slice(-4), (responseCode) => {
    console.log(responseCode)
})