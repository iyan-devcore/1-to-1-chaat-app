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


router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if user exists
    db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (row) return res.status(400).json({ error: 'Username already taken' });

        try {
            const hash = await bcrypt.hash(password, 10);

            const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
            stmt.run(username, hash, function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                // Auto login
                const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
                sessions.set(token, username);
                res.json({ token, username });
            });
            stmt.finalize();
        } catch (e) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

router.put('/profile', verifyToken, async (req, res) => {
    const { newUsername, newPassword, currentPassword } = req.body;
    const currentUser = req.user;

    if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [currentUser], async (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'User not found' });

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Incorrect current password' });

        let sql = "UPDATE users SET ";
        let params = [];
        let updates = [];

        try {
            if (newUsername && newUsername !== currentUser) {
                // Check uniqueness if changing username
                const check = await new Promise((resolve, reject) => {
                    db.get('SELECT username FROM users WHERE username = ?', [newUsername], (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    });
                });

                if (check) return res.status(400).json({ error: 'Username already taken' });

                updates.push("username = ?");
                params.push(newUsername);
            }

            if (newPassword) {
                const hash = await bcrypt.hash(newPassword, 10);
                updates.push("password_hash = ?");
                params.push(hash);
            }

            if (updates.length === 0) {
                return res.json({ message: 'No changes made' });
            }

            sql += updates.join(", ") + " WHERE username = ?";
            params.push(currentUser);

            db.run(sql, params, function (err) {
                if (err) return res.status(500).json({ error: 'Update failed' });

                // Update session if username changed
                if (newUsername && newUsername !== currentUser) {
                    // Find key for current session and update (this is simple map scan)
                    for (let [key, val] of sessions.entries()) {
                        if (val === currentUser) {
                            sessions.set(key, newUsername);
                            break;
                        }
                    }
                    req.user = newUsername; // Update for current request context
                }

                res.json({
                    message: 'Profile updated successfully',
                    username: newUsername || currentUser
                });
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Server error' });
        }
    });
});


// Middleware to verify token for other routes if needed (socket.io will handle its own)
function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    if (sessions.has(token)) {
        req.user = sessions.get(token);
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}


router.get('/users', verifyToken, (req, res) => {
    const currentUser = req.user;
    db.all('SELECT username, is_online, last_seen FROM users WHERE username != ?', [currentUser], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

module.exports = { router, sessions, verifyToken };
