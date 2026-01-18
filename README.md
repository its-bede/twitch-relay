# Twitch Relay
Enables you to use your Stream Deck to post in other channels (than your own) without having to set the focus on the browser/chat window.

## Features
- Send messages to multiple Twitch channels via HTTP requests
- Web UI for managing channels and commands (NEW!)
- SQLite database for persistent storage
- Live channel management without server restart
- Stream Deck integration

# Setup

## Initial Setup

### Node.js Version Requirements
This project requires Node.js 20 or higher due to the `better-sqlite3` dependency.

**Windows Users (Recommended):**
Use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) to manage Node.js versions:
1. Download and install nvm-windows from the link above
2. Open a new command prompt and run:
   ```batch
   nvm install 20.19.6
   nvm use 20.19.6
   ```
3. The project includes a `.nvmrc` file, so the `twitch-relay.bat` will automatically use the correct version

**Manual Installation:**
Alternatively, download Node.js 20+ from [nodejs.org](https://nodejs.org/en/download/)

### Project Setup
Download the repo whether by cloning it or downloading as zip (extract afterwards).

1. Get your personal oauth token [HERE](https://twitchapps.com/tmi/) - NEVER share it with anybody!
2. Rename `config.js.default` to `config.js`
3. Insert your oauth token and username in `config.js`
4. Open a terminal and navigate to the folder containing the project
5. Install the required node modules with `npm install`

## First Time Migration (if you have existing commands.json)
If you're upgrading from the old file-based system:

1. Rename `commands.json.default` to `commands.json` (if not already done)
2. Run the migration script: `node migrate.js`
3. This will import all your existing channels and commands into the SQLite database

## Running the Relay
Run the relay with `node index.js`

The server will start on port 5555 and display:
- All loaded channels from database
- All available commands
- Admin UI URL: http://localhost:5555/index.html

You can stop your relay with `[Ctrl] + [C]`.

## Windows Batch File (Optional)
You can use the `twitch-relay.bat` to start your local relay with a double-click.

To set it up:
1. Rename `twitch-relay.bat.default` to `twitch-relay.bat`
2. Open the file `twitch-relay.bat` in a text editor
3. Replace `C:\PATH\TO\YOUR\FOLDER\` with the real path to your relay
   - Example: `cd /d C:\Users\YourName\workspace\twitch-relay\`
4. Save the file
5. Double-click `twitch-relay.bat` to start the server
6. You may need to allow it to communicate through the firewall

**With nvm-windows:**
The batch file automatically detects nvm and uses the Node.js version specified in `.nvmrc`

**Without nvm-windows:**
The batch file uses your system's default Node.js installation (must be 20+)

If everything worked, your command prompt should look like this:

![](images/relay-running.png)

You can stop your relay with `[Ctrl] + [C]`.

# Managing Channels and Commands

## Web UI (Recommended)
Open your browser and navigate to http://localhost:5555/index.html

The Admin Panel allows you to:
- Add/Edit/Delete channels
- Add/Edit/Delete commands per channel
- Enable/Disable channels and commands
- All changes are live - no server restart needed!

## Command URL Format
Commands are accessed via: `http://localhost:5555/CHANNEL_NAME/COMMAND_NAME`

Example: `http://localhost:5555/josymovies/hi`

# Setup your Stream Deck
Use the "website" action of your Stream Deck and configure it like shown below:

![](images/streamdeck-setup.png)

The Stream Deck URLs remain unchanged and continue to work as before!