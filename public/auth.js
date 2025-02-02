import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

function getUuid() {
    if (!document.cookie) {
        document.cookie = uuidv4()
    }
    return document.cookie;
}

function connectSocket() {
    return io({
        query: {
            uuid: getUuid()
        }
    })
}

export { connectSocket }

