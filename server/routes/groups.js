const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyToken } = require('./auth');

// Create a new group
router.post('/', verifyToken, (req, res) => {
    const { name, members } = req.body; // members is array of usernames
    const createdBy = req.user;

    if (!name) return res.status(400).json({ error: 'Group name required' });

    db.run("INSERT INTO groups (name, created_by) VALUES (?, ?)", [name, createdBy], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });

        const groupId = this.lastID;

        // Add creator to group
        const allMembers = [createdBy, ...(members || [])];
        const placeholders = allMembers.map(() => '(?, (SELECT id FROM users WHERE username = ?))').join(',');

        // Flatten params: [groupId, username, groupId, username...]
        const params = [];
        allMembers.forEach(m => {
            params.push(groupId);
            params.push(m);
        });

        const sql = `INSERT INTO group_members (group_id, user_id) VALUES ${placeholders}`;

        db.run(sql, params, function (err) {
            if (err) {
                console.error("Member add error", err);
                return res.status(500).json({ error: 'Failed to add members' });
            }
            res.json({ id: groupId, name, created_by: createdBy });
        });
    });
});

// Get my groups
router.get('/', verifyToken, (req, res) => {
    const username = req.user;
    const sql = `
        SELECT g.id, g.name, g.created_by 
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        JOIN users u ON gm.user_id = u.id
        WHERE u.username = ?
    `;
    db.all(sql, [username], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Get group members
router.get('/:id/members', verifyToken, (req, res) => {
    const groupId = req.params.id;
    const sql = `
        SELECT u.username 
        FROM users u 
        JOIN group_members gm ON u.id = gm.user_id 
        WHERE gm.group_id = ?
    `;
    db.all(sql, [groupId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows.map(r => r.username));
    });
});

module.exports = router;
