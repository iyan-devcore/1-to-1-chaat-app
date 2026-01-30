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

export const joinChat = (recipient) => {
    if (socket) socket.emit('join_chat', recipient);
};

export const leaveChat = (recipient) => {
    if (socket) socket.emit('leave_chat', recipient);
};

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

export const sendTyping = (recipient) => {
    if (socket) socket.emit('typing', recipient);
};

export const sendStopTyping = (recipient) => {
    if (socket) socket.emit('stop_typing', recipient);
};

export const subscribeToTyping = (cb) => {
    if (!socket) return;
    socket.on('user_typing', (data) => cb({ ...data, isTyping: true }));
    socket.on('user_stopped_typing', (data) => cb({ ...data, isTyping: false }));
};
