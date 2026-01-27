const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db/database');

// Simple in-memory session store for this small scale app
// Map<token, username>
const sessions = new Map();

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log(`Login attempt for ${username}: User found? ${!!user}`);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        try {
            const match = await bcrypt.compare(password, user.password_hash);
            console.log(`Password match for ${username}: ${match}`);

            if (match) {
                // Generate a simple token
                const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
                sessions.set(token, user.username);
                res.json({ token, username: user.username });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (bcryptErr) {
            console.error('Bcrypt error:', bcryptErr);
            res.status(500).json({ error: 'Authentication error' });
        }
    });
});

// Middleware to verify token for other routes if needed (socket.io will handle its own)
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (sessions.has(token)) {
        req.user = sessions.get(token);
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

module.exports = { router, sessions, verifyToken };
