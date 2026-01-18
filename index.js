
/**
 * NodeJS Twitch get-request to twitch chat relay via tmi.js
 *
 * @author    Benjamin Deutscher <ben@bdeutscher.org>
 * @version   2.0.0
 * @copyright 28.05.2021 Benjamin Deutscher
 */
console.log(`Lampe385 Twitch get-request to twitch chat relay (NodeJS ${process.version})`);
let tmi, client;
const fs = require('fs');
var config;
const db = require('./database');
require('log-timestamp');

try {
  tmi = require('tmi.js');
  config = require("./config");
} catch(error) {
  console.log("Requirements missing! Try: npm install");
  console.log(error);
  process.exit(1);
}

// ---------------------------
// Setup
// ---------------------------
// Load channels from database
const dbChannels = db.getChannels();
const channelNames = dbChannels.map(ch => ch.name);

console.log(`Loaded ${channelNames.length} channels from database`);

client = new tmi.Client({
  options: {
    debug: false
  },
  connection: {
    reconnect: true,
    secure: true
  },
  identity: {
    username: config.username,
    password: config.token
  },
  channels: channelNames
});
client.connect();

// Twitch CLIENT EVENTS
client.on('connected', (address, port) => {
  console.log(`Connected: ${address}:${port}`);
});

client.on('join', (channel, username, self) => {
  if(self) console.log(`${username} joined ${channel}`);
});

client.on('notice', (channel, msgid, message) => {
  console.log(`notice: [${channel}] ${msgid} => ${message}`);
});

client.on('message', (channel, userstate, message, self) => {
  if(self) return;

  console.log(`<${userstate['display-name']}> ${message}`);
});

process.on('SIGINT', function() {
  client.disconnect();
  console.log("SIGINT");
  process.exit();
});


// LOCAL WEBSERVER SETUP
var express = require('express');
var app = express();

// Enable JSON body parsing for API endpoints
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// on the request to root (localhost:5555/) - redirect to admin UI
app.get('/', function (req, res) {
  res.redirect('/index.html');
});

// start the server in the port 5555 !
app.listen(5555, function () {
  console.log('Twitch get-request to chat relay listening on port 5555.');
  console.log('Admin UI: http://localhost:5555/index.html');
});

// Display available commands from database
console.log("    Available Commands (from database):");
const allCommands = db.getAllCommands();
const commandsByChannel = {};

allCommands.forEach(cmd => {
  if (!commandsByChannel[cmd.channel_name]) {
    commandsByChannel[cmd.channel_name] = [];
  }
  commandsByChannel[cmd.channel_name].push(cmd);
});

for (const [channel, commands] of Object.entries(commandsByChannel)) {
  console.log(`    Channel: ${channel.padStart(19, ' ')}`);
  console.log("========================================");
  commands.forEach(cmd => {
    console.log(`${cmd.name.padStart(20, ' ')}: ${cmd.response}`);
  });
  console.log("========================================");
}

// ============================================
// REST API ENDPOINTS
// ============================================

// --- CHANNELS API ---

// GET all channels
app.get('/api/channels', (req, res) => {
  try {
    const channels = db.getChannels(true); // Include disabled
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new channel
app.post('/api/channels', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Add to database
    const channel = db.addChannel(name);

    // Join Twitch channel
    await client.join(name);
    console.log(`Joined channel: ${name}`);

    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update channel
app.put('/api/channels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const channel = db.updateChannel(id, req.body);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE channel
app.delete('/api/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const channel = db.getChannel(id);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Delete from database (cascade deletes commands)
    db.deleteChannel(id);

    // Part from Twitch channel
    await client.part(channel.name);
    console.log(`Left channel: ${channel.name}`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- COMMANDS API ---

// GET all commands (optionally filter by channel_id)
app.get('/api/commands', (req, res) => {
  try {
    const { channel_id } = req.query;

    if (channel_id) {
      const commands = db.getCommands(channel_id, true); // Include disabled
      res.json(commands);
    } else {
      const commands = db.getAllCommands();
      res.json(commands);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new command
app.post('/api/commands', (req, res) => {
  try {
    const { channel_id, name, response } = req.body;

    if (!channel_id || !name || !response) {
      return res.status(400).json({ error: 'channel_id, name, and response are required' });
    }

    const command = db.addCommand(channel_id, name, response);
    res.json(command);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update command
app.put('/api/commands/:id', (req, res) => {
  try {
    const { id } = req.params;
    const command = db.updateCommand(id, req.body);

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json(command);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE command
app.delete('/api/commands/:id', (req, res) => {
  try {
    const { id } = req.params;
    const command = db.getCommand(id);

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    db.deleteCommand(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COMMAND EXECUTION ROUTE
// ============================================

// Dynamic command route - lookup from database
app.get('/:channel/:command', function (req, res) {
  const { channel, command } = req.params;

  // Lookup command in database
  const cmd = db.getCommandByName(channel, command);

  if (!cmd) {
    return res.status(404).send('Command not found');
  }

  // Send message to Twitch channel
  client.say(channel, cmd.response)
    .then(() => {
      // Log execution
      db.logCommandExecution(cmd.id);
      res.send('done');
    })
    .catch(err => {
      console.error(`Error sending message: ${err}`);
      res.status(500).send('Error sending message');
    });
});

// Change the 404 message modifing the middleware
app.use(function(req, res, next) {
  res.status(404).send("Sorry, that route doesn't exist.");
});

// EOF
