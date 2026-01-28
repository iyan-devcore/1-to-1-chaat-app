const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath);

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const initDb = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password_hash TEXT
            )`);

      // Messages table
      db.run(`CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT,
                recipient TEXT,
                content TEXT,
                type TEXT DEFAULT 'text',
                fileUrl TEXT,
                fileName TEXT,
                fileSize INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

      // Check for recipient column migration
      db.all("PRAGMA table_info(messages)", (err, rows) => {
        if (!err && rows) {
          const hasRecipient = rows.some(r => r.name === 'recipient');
          if (!hasRecipient) {
            console.log("Migrating DB: Adding recipient column");
            db.run("ALTER TABLE messages ADD COLUMN recipient TEXT");
          }
        }
      });

      resolve();
    });
  });
};

const seedUsers = async () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT count(*) as count FROM users", async (err, row) => {
      if (err) return reject(err);

      if (row.count === 0) {
        console.log("Seeding default users...");
        try {
          const hash1 = await bcrypt.hash('password123', 10);
          const hash2 = await bcrypt.hash('password123', 10);

          const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
          stmt.run("user1", hash1);
          stmt.run("user2", hash2);
          stmt.finalize(() => {
            console.log("Default users created: user1/password123, user2/password123");
            resolve();
          });
        } catch (e) {
          reject(e);
        }
      } else {
        resolve(); // Already seeded
      }
    });
  });
};

// Initialize
initDb().then(() => {
  return seedUsers();
}).catch(err => {
  console.error("Database initialization error:", err);
});

module.exports = db;
