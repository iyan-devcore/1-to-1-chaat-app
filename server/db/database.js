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
                password_hash TEXT,
                is_online INTEGER DEFAULT 0,
                last_seen DATETIME
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
                status TEXT DEFAULT 'sent',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

      // Check for recipient/status column migration in messages
      db.all("PRAGMA table_info(messages)", (err, rows) => {
        if (!err && rows) {
          const hasRecipient = rows.some(r => r.name === 'recipient');
          if (!hasRecipient) {
            console.log("Migrating DB: Adding recipient column");
            db.run("ALTER TABLE messages ADD COLUMN recipient TEXT");
          }
          const hasStatus = rows.some(r => r.name === 'status');
          if (!hasStatus) {
            console.log("Migrating DB: Adding status column");
            db.run("ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent'");
          }
        }

        // Check for is_online/last_seen column migration in users
        // Nesting inside subsequent call or just next in flow - since db.all is async, we should probably nest or use promises. 
        // But for sqlite3, we can rely on db.serialize IF we put the dependent logic inside the callback of the helper.
        // Actually, db.all is NOT serialized automatically in terms of its callback execution vs next statements outside.

        db.all("PRAGMA table_info(users)", (err, rows) => {
          if (!err && rows) {
            const hasIsOnline = rows.some(r => r.name === 'is_online');
            if (!hasIsOnline) {
              console.log("Migrating DB: Adding is_online column");
              db.run("ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0", runReset);
            } else {
              runReset();
            }

            const hasLastSeen = rows.some(r => r.name === 'last_seen');
            if (!hasLastSeen) {
              console.log("Migrating DB: Adding last_seen column");
              db.run("ALTER TABLE users ADD COLUMN last_seen DATETIME");
            }
          } else {
            runReset();
          }
        });
      });

      function runReset() {
        // Reset online status on startup
        // We wrap in a short timeout or just run it, assuming ALTER TABLE (if called) queues up.
        // Inside db.serialize, db.run is sequential.
        db.run("UPDATE users SET is_online = 0", (err) => {
          if (err && err.message.includes('no such column')) {
            // If we still hit a race, retrying usually works or it means migration failed.
            console.error("Retrying online status reset due to race condition...");
            setTimeout(() => db.run("UPDATE users SET is_online = 0"), 1000);
          }
          resolve();
        });
      }
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
