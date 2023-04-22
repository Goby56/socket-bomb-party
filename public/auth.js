import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

function getUuid() {
    let uuid = window.localStorage.getItem("uuid")
    if (!uuid) {
        uuid = uuidv4()
        window.localStorage.setItem("uuid", uuid)
    }
    return uuid;
}

function connectSocket() {
    return io({
        query: {
            uuid: getUuid()
        }
    })
}

export { connectSocket }

