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
        socket.join('chat_room'); // Both users join the same room

        // Send history on connection
        db.all("SELECT * FROM messages ORDER BY timestamp ASC", [], (err, rows) => {
            if (err) return;
            socket.emit('history', rows);
        });

        socket.on('message', (msg) => {
            // msg: { content, type, fileUrl, fileName, fileSize }
            const { content, type, fileUrl, fileName, fileSize } = msg;

            const stmt = db.prepare("INSERT INTO messages (sender, content, type, fileUrl, fileName, fileSize) VALUES (?, ?, ?, ?, ?, ?)");
            stmt.run(username, content, type || 'text', fileUrl, fileName, fileSize, function (err) {
                if (err) return console.error(err);

                // Broadcast the new message with ID and timestamp
                const newMessage = {
                    id: this.lastID,
                    sender: username,
                    content,
                    type: type || 'text',
                    fileUrl,
                    fileName,
                    fileSize,
                    timestamp: new Date().toISOString()
                };
                io.to('chat_room').emit('message', newMessage);
            });
            stmt.finalize();
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};
