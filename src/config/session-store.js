/**
 * Wisuda Platform — Custom Better-Sqlite3 Session Store for Express-Session
 * 100% Native Better-Sqlite3 Driver (Zero native C++ build binding issues on PM2/Linux)
 */

function createBetterSqliteStore(session) {
  const Store = session.Store;

  class BetterSqliteStore extends Store {
    constructor(options = {}) {
      super(options);
      const { getDb } = require('./database');
      this.db = getDb();

      // Ensure sessions table exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid TEXT PRIMARY KEY,
          sess TEXT NOT NULL,
          expired DATETIME NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
      `);

      // Cleanup expired sessions every 15 minutes
      this.cleanupInterval = setInterval(() => {
        try {
          this.db.prepare("DELETE FROM sessions WHERE datetime(expired) < datetime('now')").run();
        } catch (e) {}
      }, 15 * 60 * 1000);

      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }

    get(sid, cb) {
      try {
        const row = this.db.prepare("SELECT sess, expired FROM sessions WHERE sid = ?").get(sid);
        if (!row) return cb(null, null);

        // Check expiration
        if (new Date(row.expired).getTime() < Date.now()) {
          this.destroy(sid, () => {});
          return cb(null, null);
        }

        const sess = JSON.parse(row.sess);
        return cb(null, sess);
      } catch (err) {
        return cb(err);
      }
    }

    set(sid, sess, cb) {
      try {
        const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
        const expired = new Date(Date.now() + maxAge).toISOString();
        const jsonSess = JSON.stringify(sess);

        this.db.prepare(`
          INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
          ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired
        `).run(sid, jsonSess, expired);

        return cb(null);
      } catch (err) {
        return cb(err);
      }
    }

    destroy(sid, cb) {
      try {
        this.db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
        if (cb) cb(null);
      } catch (err) {
        if (cb) cb(err);
      }
    }

    touch(sid, sess, cb) {
      try {
        const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
        const expired = new Date(Date.now() + maxAge).toISOString();
        this.db.prepare("UPDATE sessions SET expired = ? WHERE sid = ?").run(expired, sid);
        if (cb) cb(null);
      } catch (err) {
        if (cb) cb(err);
      }
    }
  }

  return BetterSqliteStore;
}

module.exports = createBetterSqliteStore;
