/**
 * SQLite Database Wrapper for Twitch Relay
 * Manages channels and commands
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'twitch-relay.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      response TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      UNIQUE(channel_id, name)
    );

    CREATE TABLE IF NOT EXISTS command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id INTEGER NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (command_id) REFERENCES commands(id) ON DELETE CASCADE
    );
  `);
  console.log('Database initialized');
}

// Initialize on module load
initDatabase();

// ============================================
// CHANNELS
// ============================================

/**
 * Get all channels (only enabled by default)
 */
function getChannels(includeDisabled = false) {
  const sql = includeDisabled
    ? 'SELECT * FROM channels ORDER BY name'
    : 'SELECT * FROM channels WHERE enabled = 1 ORDER BY name';

  return db.prepare(sql).all();
}

/**
 * Get single channel by ID
 */
function getChannel(id) {
  return db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
}

/**
 * Get channel by name
 */
function getChannelByName(name) {
  return db.prepare('SELECT * FROM channels WHERE name = ?').get(name);
}

/**
 * Add a new channel
 */
function addChannel(name) {
  const stmt = db.prepare('INSERT INTO channels (name) VALUES (?)');
  const result = stmt.run(name);
  return getChannel(result.lastInsertRowid);
}

/**
 * Update channel
 */
function updateChannel(id, data) {
  const updates = [];
  const values = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(data.enabled ? 1 : 0);
  }

  if (updates.length === 0) return getChannel(id);

  values.push(id);
  const sql = `UPDATE channels SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);
  return getChannel(id);
}

/**
 * Delete channel (cascade deletes commands)
 */
function deleteChannel(id) {
  const stmt = db.prepare('DELETE FROM channels WHERE id = ?');
  return stmt.run(id);
}

// ============================================
// COMMANDS
// ============================================

/**
 * Get all commands for a channel
 */
function getCommands(channelId, includeDisabled = false) {
  const sql = includeDisabled
    ? 'SELECT * FROM commands WHERE channel_id = ? ORDER BY name'
    : 'SELECT * FROM commands WHERE channel_id = ? AND enabled = 1 ORDER BY name';

  return db.prepare(sql).all(channelId);
}

/**
 * Get all commands across all channels (for API)
 */
function getAllCommands() {
  const sql = `
    SELECT
      c.id,
      c.channel_id,
      ch.name as channel_name,
      c.name,
      c.response,
      c.enabled,
      c.created_at,
      c.updated_at
    FROM commands c
    JOIN channels ch ON c.channel_id = ch.id
    ORDER BY ch.name, c.name
  `;
  return db.prepare(sql).all();
}

/**
 * Get single command by ID
 */
function getCommand(id) {
  return db.prepare('SELECT * FROM commands WHERE id = ?').get(id);
}

/**
 * Get command by channel name and command name
 */
function getCommandByName(channelName, commandName) {
  const sql = `
    SELECT c.*
    FROM commands c
    JOIN channels ch ON c.channel_id = ch.id
    WHERE ch.name = ? AND c.name = ? AND c.enabled = 1 AND ch.enabled = 1
  `;
  return db.prepare(sql).get(channelName, commandName);
}

/**
 * Add a new command
 */
function addCommand(channelId, name, response) {
  const stmt = db.prepare(`
    INSERT INTO commands (channel_id, name, response)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(channelId, name, response);
  return getCommand(result.lastInsertRowid);
}

/**
 * Update command
 */
function updateCommand(id, data) {
  const updates = [];
  const values = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.response !== undefined) {
    updates.push('response = ?');
    values.push(data.response);
  }
  if (data.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(data.enabled ? 1 : 0);
  }

  if (updates.length === 0) return getCommand(id);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const sql = `UPDATE commands SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);
  return getCommand(id);
}

/**
 * Delete command
 */
function deleteCommand(id) {
  const stmt = db.prepare('DELETE FROM commands WHERE id = ?');
  return stmt.run(id);
}

// ============================================
// LOGGING
// ============================================

/**
 * Log command execution
 */
function logCommandExecution(commandId) {
  const stmt = db.prepare('INSERT INTO command_logs (command_id) VALUES (?)');
  return stmt.run(commandId);
}

/**
 * Get command execution stats
 */
function getCommandStats(commandId) {
  const sql = `
    SELECT
      COUNT(*) as total_executions,
      MAX(executed_at) as last_executed
    FROM command_logs
    WHERE command_id = ?
  `;
  return db.prepare(sql).get(commandId);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Channels
  getChannels,
  getChannel,
  getChannelByName,
  addChannel,
  updateChannel,
  deleteChannel,

  // Commands
  getCommands,
  getAllCommands,
  getCommand,
  getCommandByName,
  addCommand,
  updateCommand,
  deleteCommand,

  // Logging
  logCommandExecution,
  getCommandStats,

  // Direct DB access (for advanced usage)
  db
};
