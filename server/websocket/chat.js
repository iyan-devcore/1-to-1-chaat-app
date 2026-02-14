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

        // Update online status
        db.run("UPDATE users SET is_online = 1 WHERE username = ?", [username], (err) => {
            if (!err) {
                socket.broadcast.emit('user_status_change', { username, is_online: 1 });
            }
        });

        // Client requests history with a specific user or group
        socket.on('join_chat', (target) => {
            let roomName;

            if (target.startsWith('group:')) {
                // It's a group
                roomName = target; // Room is literally 'group:123'
                socket.join(roomName);

                // Fetch group history
                // We store recipient as 'group:ID' in DB
                db.all(
                    "SELECT * FROM messages WHERE recipient = ? ORDER BY timestamp ASC",
                    [roomName],
                    (err, rows) => {
                        if (err) return;
                        socket.emit('history', rows);
                    }
                );

            } else {
                // It's a 1-to-1 chat
                const targetUser = target;
                roomName = [username, targetUser].sort().join('_');
                socket.join(roomName);

                // Mark unread messages from targetUser as read
                db.run(
                    "UPDATE messages SET status = 'read' WHERE sender = ? AND recipient = ? AND status != 'read'",
                    [targetUser, username],
                    function (err) {
                        if (!err && this.changes > 0) {
                            // Notify the sender (targetUser) that their messages were read
                            io.to(targetUser).emit('status_update', { reader: username });
                        }

                        // Fetch history for these two users
                        db.all(
                            "SELECT * FROM messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY timestamp ASC",
                            [username, targetUser, targetUser, username],
                            (err, rows) => {
                                if (err) return;
                                socket.emit('history', rows);
                            }
                        );
                    }
                );
            }
        });

        // Client leaves chat
        socket.on('leave_chat', (target) => {
            if (!target) return;
            let roomName;
            if (target.startsWith('group:')) {
                roomName = target;
            } else {
                roomName = [username, target].sort().join('_');
            }
            socket.leave(roomName);
        });

        socket.on('mark_read', (data) => {
            const { sender } = data;
            if (!sender) return;

            db.run(
                "UPDATE messages SET status = 'read' WHERE sender = ? AND recipient = ? AND status != 'read'",
                [sender, username],
                function (err) {
                    if (!err && this.changes > 0) {
                        io.to(sender).emit('status_update', { reader: username });
                    }
                }
            );
        });

        socket.on('message', (msg) => {
            // msg: { recipient, content, type, fileUrl, fileName, fileSize, replyTo }
            const { recipient, content, type, fileUrl, fileName, fileSize, replyTo } = msg;

            if (!recipient) return; // Must have recipient

            const replyToData = replyTo ? JSON.stringify(replyTo) : null;

            const stmt = db.prepare("INSERT INTO messages (sender, recipient, content, type, fileUrl, fileName, fileSize, status, reply_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            stmt.run(username, recipient, content, type || 'text', fileUrl, fileName, fileSize, 'sent', replyToData, function (err) {
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
                    status: 'sent',
                    reply_to: replyToData, // Keeping consistency with DB column name for simplicity in frontend
                    timestamp: new Date().toISOString()
                };

                // Identify the room and emit
                let roomName;
                if (recipient.startsWith('group:')) {
                    roomName = recipient;
                } else {
                    roomName = [username, recipient].sort().join('_');
                }
                io.to(roomName).emit('message', newMessage);
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
            if (username) {
                const now = new Date().toISOString();
                db.run("UPDATE users SET is_online = 0, last_seen = ? WHERE username = ?", [now, username], (err) => {
                    if (!err) {
                        socket.broadcast.emit('user_status_change', { username, is_online: 0, last_seen: now });
                    }
                });
            }
        });
    });
};
