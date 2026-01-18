/**
 * Migration Script: Import data from config.js and commands.json to SQLite
 * Usage: node migrate.js
 */

const fs = require('fs');
const db = require('./database');

console.log('===========================================');
console.log('Twitch Relay - Migration to SQLite');
console.log('===========================================\n');

// Check if config.js exists
let config;
try {
  config = require('./config');
  console.log('[✓] config.js loaded');
} catch (error) {
  console.error('[✗] config.js not found. Please copy config.js.default to config.js');
  process.exit(1);
}

// Check if commands.json exists
let commandsData;
try {
  const data = fs.readFileSync('./commands.json', 'utf8');
  commandsData = JSON.parse(data);
  console.log('[✓] commands.json loaded\n');
} catch (error) {
  console.error('[✗] commands.json not found. Please copy commands.json.default to commands.json');
  process.exit(1);
}

// Migration statistics
let stats = {
  channelsAdded: 0,
  channelsSkipped: 0,
  commandsAdded: 0,
  commandsSkipped: 0
};

console.log('Starting migration...\n');

// Migrate channels from config.js
console.log('--- Migrating Channels ---');
if (config.channels && Array.isArray(config.channels)) {
  config.channels.forEach(channelName => {
    try {
      // Check if channel already exists
      const existing = db.getChannelByName(channelName);
      if (existing) {
        console.log(`[SKIP] Channel already exists: ${channelName}`);
        stats.channelsSkipped++;
      } else {
        db.addChannel(channelName);
        console.log(`[ADD]  Channel: ${channelName}`);
        stats.channelsAdded++;
      }
    } catch (error) {
      console.error(`[ERROR] Failed to add channel ${channelName}: ${error.message}`);
    }
  });
} else {
  console.log('[WARN] No channels found in config.js');
}

console.log('');

// Migrate commands from commands.json
console.log('--- Migrating Commands ---');
if (commandsData && Array.isArray(commandsData) && commandsData.length > 0) {
  const commandsObj = commandsData[0];

  for (const [channelName, commands] of Object.entries(commandsObj)) {
    // Get or create channel
    let channel = db.getChannelByName(channelName);

    if (!channel) {
      console.log(`[INFO] Channel not in config, creating: ${channelName}`);
      channel = db.addChannel(channelName);
      stats.channelsAdded++;
    }

    console.log(`\nChannel: ${channelName} (ID: ${channel.id})`);

    // Add commands for this channel
    if (Array.isArray(commands)) {
      commands.forEach(cmd => {
        if (!cmd.name || !cmd.response) {
          console.log(`[WARN] Invalid command structure, skipping`);
          stats.commandsSkipped++;
          return;
        }

        try {
          // Check if command already exists
          const existingCommands = db.getCommands(channel.id);
          const exists = existingCommands.find(c => c.name === cmd.name);

          if (exists) {
            console.log(`  [SKIP] ${cmd.name} (already exists)`);
            stats.commandsSkipped++;
          } else {
            db.addCommand(channel.id, cmd.name, cmd.response);
            console.log(`  [ADD]  ${cmd.name} → "${cmd.response.substring(0, 40)}${cmd.response.length > 40 ? '...' : ''}"`);
            stats.commandsAdded++;
          }
        } catch (error) {
          console.error(`  [ERROR] Failed to add command ${cmd.name}: ${error.message}`);
          stats.commandsSkipped++;
        }
      });
    }
  }
} else {
  console.log('[WARN] No commands found in commands.json');
}

console.log('\n===========================================');
console.log('Migration Summary:');
console.log('===========================================');
console.log(`Channels added:   ${stats.channelsAdded}`);
console.log(`Channels skipped: ${stats.channelsSkipped}`);
console.log(`Commands added:   ${stats.commandsAdded}`);
console.log(`Commands skipped: ${stats.commandsSkipped}`);
console.log('===========================================');

// Show final database state
console.log('\n--- Database Contents ---');
const allChannels = db.getChannels();
console.log(`\nTotal channels: ${allChannels.length}`);
allChannels.forEach(channel => {
  const commands = db.getCommands(channel.id);
  console.log(`  ${channel.name} (${commands.length} commands)`);
});

const allCommands = db.getAllCommands();
console.log(`\nTotal commands: ${allCommands.length}`);

console.log('\n[✓] Migration complete!');
console.log('\nYou can now start the server with: node index.js');
