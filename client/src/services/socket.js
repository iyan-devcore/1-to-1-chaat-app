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
    const listener = (msg) => {
        cb(null, msg);
    };
    socket.on('message', listener);
    return () => socket.off('message', listener);
};

export const subscribeToHistory = (cb) => {
    if (!socket) return;
    const listener = (messages) => {
        cb(messages);
    };
    socket.on('history', listener);
    return () => socket.off('history', listener);
};

export const sendTyping = (recipient) => {
    if (socket) socket.emit('typing', recipient);
};

export const sendStopTyping = (recipient) => {
    if (socket) socket.emit('stop_typing', recipient);
};

export const subscribeToTyping = (cb) => {
    if (!socket) return;
    const typingListener = (data) => cb({ ...data, isTyping: true });
    const stopTypingListener = (data) => cb({ ...data, isTyping: false });

    socket.on('user_typing', typingListener);
    socket.on('user_stopped_typing', stopTypingListener);

    return () => {
        socket.off('user_typing', typingListener);
        socket.off('user_stopped_typing', stopTypingListener);
    };
};

export const markRead = (sender) => {
    if (socket) socket.emit('mark_read', { sender });
};

export const subscribeToStatusUpdates = (cb) => {
    if (!socket) return;
    const listener = (data) => cb(data);
    socket.on('status_update', listener);
    return () => socket.off('status_update', listener);
};

export const subscribeToUserStatus = (cb) => {
    if (!socket) return;
    const listener = (data) => cb(data);
    socket.on('user_status_change', listener);
    return () => socket.off('user_status_change', listener);
};

