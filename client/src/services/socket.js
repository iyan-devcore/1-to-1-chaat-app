import { io } from "socket.io-client";

let socket;

export const initiateSocket = (token) => {
    if (socket) return socket;

    socket = io('/', {
        auth: {
            token
        }
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export const sendMessage = (messageData) => {
    if (socket) socket.emit('message', messageData);
}

export const subscribeToMessages = (cb) => {
    if (!socket) return;
    socket.on('message', msg => {
        cb(null, msg);
    });
};

export const subscribeToHistory = (cb) => {
    if (!socket) return;
    socket.on('history', (messages) => {
        cb(messages);
    });
};
