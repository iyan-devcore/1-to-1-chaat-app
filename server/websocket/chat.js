const db = require('../db/database');

module.exports = (io, sessions) => {
    io.on('connection', (socket) => {
        console.log('A user connected');

        // Authentication handshake
        const token = socket.handshake.auth.token;
        if (!token || !sessions.has(token)) {
            console.log('Auth failed for socket');
            socket.disconnect();
            return;
        }

        const username = sessions.get(token);
        // User joins their own room for direct notifications
        socket.join(username);

        // Client requests history with a specific user
        socket.on('join_chat', (targetUser) => {
            const roomName = [username, targetUser].sort().join('_');
            socket.join(roomName);

            // Fetch history for these two users
            db.all(
                "SELECT * FROM messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY timestamp ASC",
                [username, targetUser, targetUser, username],
                (err, rows) => {
                    if (err) return;
                    socket.emit('history', rows);
                }
            );
        });

        // Client leaves chat with a specific user
        socket.on('leave_chat', (targetUser) => {
            const roomName = [username, targetUser].sort().join('_');
            socket.leave(roomName);
        });

        socket.on('message', (msg) => {
            // msg: { recipient, content, type, fileUrl, fileName, fileSize }
            const { recipient, content, type, fileUrl, fileName, fileSize } = msg;

            if (!recipient) return; // Must have recipient

            const stmt = db.prepare("INSERT INTO messages (sender, recipient, content, type, fileUrl, fileName, fileSize) VALUES (?, ?, ?, ?, ?, ?, ?)");
            stmt.run(username, recipient, content, type || 'text', fileUrl, fileName, fileSize, function (err) {
                if (err) return console.error(err);

                const newMessage = {
                    id: this.lastID,
                    sender: username,
                    recipient,
                    content,
                    type: type || 'text',
                    fileUrl,
                    fileName,
                    fileSize,
                    timestamp: new Date().toISOString()
                };

                // Identify the shared room
                const roomName = [username, recipient].sort().join('_');

                // Emit to the room (covers both users if they are focused on this chat)
                io.to(roomName).emit('message', newMessage);

                // Also emit to recipient's personal room for notifications (if implemented later) or if they aren't in the specific chat room yet?
                // Actually, if we use the room strategy, we rely on them being joined.
                // But if the other user relies on a global 'message' event for unread counts, we might want to emit to them directly too.
                // For now, sticking to the detailed view strategy.
            });
            stmt.finalize();
        });

        socket.on('typing', (targetUser) => {
            const roomName = [username, targetUser].sort().join('_');
            socket.to(roomName).emit('user_typing', { user: username });
        });

        socket.on('stop_typing', (targetUser) => {
            const roomName = [username, targetUser].sort().join('_');
            socket.to(roomName).emit('user_stopped_typing', { user: username });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};
