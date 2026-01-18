/**
 * Twitch Relay Admin Panel - Frontend Logic
 */

// State
let channels = [];
let commands = [];
let selectedChannelId = null;

// DOM Elements
const channelsTbody = document.getElementById('channels-tbody');
const commandsTbody = document.getElementById('commands-tbody');
const channelSelect = document.getElementById('channel-select');
const commandsSection = document.getElementById('commands-section');

// Tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// ============================================
// CHANNELS
// ============================================

async function loadChannels() {
  try {
    const response = await fetch('/api/channels');
    channels = await response.json();

    renderChannels();
    updateChannelSelect();
  } catch (error) {
    console.error('Error loading channels:', error);
    channelsTbody.innerHTML = '<tr><td colspan="5" class="loading">Fehler beim Laden</td></tr>';
  }
}

function renderChannels() {
  if (channels.length === 0) {
    channelsTbody.innerHTML = '<tr><td colspan="5" class="loading">Keine Channels vorhanden</td></tr>';
    return;
  }

  channelsTbody.innerHTML = channels.map(channel => `
    <tr>
      <td>${channel.id}</td>
      <td><strong>${channel.name}</strong></td>
      <td>
        <span class="status-badge ${channel.enabled ? 'status-enabled' : 'status-disabled'}">
          ${channel.enabled ? 'Aktiv' : 'Deaktiviert'}
        </span>
      </td>
      <td>${new Date(channel.created_at).toLocaleDateString('de-DE')}</td>
      <td>
        <div class="actions">
          <button class="btn btn-edit" onclick="editChannel(${channel.id})">Bearbeiten</button>
          <button class="btn btn-danger" onclick="deleteChannel(${channel.id})">Löschen</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateChannelSelect() {
  channelSelect.innerHTML = '<option value="">-- Channel wählen --</option>' +
    channels
      .filter(ch => ch.enabled)
      .map(ch => `<option value="${ch.id}">${ch.name}</option>`)
      .join('');
}

// Add Channel
document.getElementById('add-channel-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-channel-name').value.trim();

  if (!name) {
    alert('Bitte Channel-Namen eingeben');
    return;
  }

  try {
    const response = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (response.ok) {
      document.getElementById('new-channel-name').value = '';
      await loadChannels();
      alert(`Channel "${name}" wurde hinzugefügt`);
    } else {
      const error = await response.json();
      alert(`Fehler: ${error.error}`);
    }
  } catch (error) {
    console.error('Error adding channel:', error);
    alert('Fehler beim Hinzufügen des Channels');
  }
});

// Edit Channel
function editChannel(id) {
  const channel = channels.find(ch => ch.id === id);
  if (!channel) return;

  document.getElementById('edit-channel-id').value = channel.id;
  document.getElementById('edit-channel-name').value = channel.name;
  document.getElementById('edit-channel-enabled').checked = channel.enabled === 1;

  document.getElementById('edit-channel-modal').classList.add('active');
}

document.getElementById('save-channel-btn').addEventListener('click', async () => {
  const id = document.getElementById('edit-channel-id').value;
  const name = document.getElementById('edit-channel-name').value.trim();
  const enabled = document.getElementById('edit-channel-enabled').checked ? 1 : 0;

  try {
    const response = await fetch(`/api/channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, enabled })
    });

    if (response.ok) {
      document.getElementById('edit-channel-modal').classList.remove('active');
      await loadChannels();
      alert('Channel aktualisiert');
    } else {
      const error = await response.json();
      alert(`Fehler: ${error.error}`);
    }
  } catch (error) {
    console.error('Error updating channel:', error);
    alert('Fehler beim Aktualisieren');
  }
});

document.getElementById('cancel-channel-btn').addEventListener('click', () => {
  document.getElementById('edit-channel-modal').classList.remove('active');
});

// Delete Channel
async function deleteChannel(id) {
  const channel = channels.find(ch => ch.id === id);
  if (!channel) return;

  if (!confirm(`Channel "${channel.name}" wirklich löschen? Alle Commands werden ebenfalls gelöscht.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/channels/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      await loadChannels();
      alert('Channel gelöscht');
    } else {
      const error = await response.json();
      alert(`Fehler: ${error.error}`);
    }
  } catch (error) {
    console.error('Error deleting channel:', error);
    alert('Fehler beim Löschen');
  }
}

// ============================================
// COMMANDS
// ============================================

channelSelect.addEventListener('change', async (e) => {
  selectedChannelId = e.target.value;

  if (!selectedChannelId) {
    commandsSection.style.display = 'none';
    return;
  }

  commandsSection.style.display = 'block';
  await loadCommands(selectedChannelId);
});

async function loadCommands(channelId) {
  try {
    commandsTbody.innerHTML = '<tr><td colspan="5" class="loading">Lädt...</td></tr>';

    const response = await fetch(`/api/commands?channel_id=${channelId}`);
    commands = await response.json();

    renderCommands();
  } catch (error) {
    console.error('Error loading commands:', error);
    commandsTbody.innerHTML = '<tr><td colspan="5" class="loading">Fehler beim Laden</td></tr>';
  }
}

function renderCommands() {
  if (commands.length === 0) {
    commandsTbody.innerHTML = '<tr><td colspan="5" class="loading">Keine Commands vorhanden</td></tr>';
    return;
  }

  const channel = channels.find(ch => ch.id == selectedChannelId);
  if (!channel) {
    commandsTbody.innerHTML = '<tr><td colspan="5" class="loading">Fehler: Channel nicht gefunden</td></tr>';
    return;
  }

  commandsTbody.innerHTML = commands.map(cmd => `
    <tr>
      <td>${cmd.id}</td>
      <td><strong>${cmd.name}</strong></td>
      <td>${cmd.response}</td>
      <td>
        <span class="status-badge ${cmd.enabled ? 'status-enabled' : 'status-disabled'}">
          ${cmd.enabled ? 'Aktiv' : 'Deaktiviert'}
        </span>
      </td>
      <td>
        <div class="actions">
          <button class="btn btn-test" onclick="testCommand('${channel.name}', '${cmd.name}', \`${cmd.response.replace(/`/g, '\\`')}\`)">Test</button>
          <button class="btn btn-edit" onclick="editCommand(${cmd.id})">Bearbeiten</button>
          <button class="btn btn-danger" onclick="deleteCommand(${cmd.id})">Löschen</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Add Command
document.getElementById('add-command-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-command-name').value.trim();
  const response = document.getElementById('new-command-response').value.trim();

  if (!name || !response) {
    alert('Bitte Name und Response eingeben');
    return;
  }

  try {
    const apiResponse = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: selectedChannelId,
        name,
        response
      })
    });

    if (apiResponse.ok) {
      document.getElementById('new-command-name').value = '';
      document.getElementById('new-command-response').value = '';
      await loadCommands(selectedChannelId);
      alert(`Command "${name}" wurde hinzugefügt`);
    } else {
      const error = await apiResponse.json();
      alert(`Fehler: ${error.error}`);
    }
  } catch (error) {
    console.error('Error adding command:', error);
    alert('Fehler beim Hinzufügen des Commands');
  }
});

// Edit Command
function editCommand(id) {
  const command = commands.find(cmd => cmd.id === id);
  if (!command) return;

  document.getElementById('edit-command-id').value = command.id;
  document.getElementById('edit-command-name').value = command.name;
  document.getElementById('edit-command-response').value = command.response;
  document.getElementById('edit-command-enabled').checked = command.enabled === 1;

  document.getElementById('edit-command-modal').classList.add('active');
}

document.getElementById('save-command-btn').addEventListener('click', async () => {
  const id = document.getElementById('edit-command-id').value;
  const name = document.getElementById('edit-command-name').value.trim();
  const response = document.getElementById('edit-command-response').value.trim();
  const enabled = document.getElementById('edit-command-enabled').checked ? 1 : 0;

  try {
    const apiResponse = await fetch(`/api/commands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, response, enabled })
    });

    if (apiResponse.ok) {
      document.getElementById('edit-command-modal').classList.remove('active');
      await loadCommands(selectedChannelId);
      alert('Command aktualisiert');
    } else {
      const error = await apiResponse.json();
      alert(`Fehler: ${error.error}`);
    }
  } catch (error) {
    console.error('Error updating command:', error);
    alert('Fehler beim Aktualisieren');
  }
});

document.getElementById('cancel-command-btn').addEventListener('click', () => {
  document.getElementById('edit-command-modal').classList.remove('active');
});

// Delete Command
async function deleteCommand(id) {
  const command = commands.find(cmd => cmd.id === id);
  if (!command) return;

  if (!confirm(`Command "${command.name}" wirklich löschen?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/commands/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      await loadCommands(selectedChannelId);
      alert('Command gelöscht');
    } else {
      const error = await response.json();
      alert(`Fehler: ${error.error}`);
    }
  } catch (error) {
    console.error('Error deleting command:', error);
    alert('Fehler beim Löschen');
  }
}

// Test Command
async function testCommand(channelName, commandName, response) {
  if (!confirm(`Command "${commandName}" testen?\n\nSendet Nachricht in #${channelName}:\n"${response}"`)) {
    return;
  }

  try {
    const testResponse = await fetch(`/${channelName}/${commandName}`);

    if (testResponse.ok) {
      alert(`Command erfolgreich getestet!\nNachricht wurde an #${channelName} gesendet.`);
    } else {
      alert(`Fehler beim Testen: ${testResponse.status} ${testResponse.statusText}`);
    }
  } catch (error) {
    console.error('Error testing command:', error);
    alert('Fehler beim Testen des Commands');
  }
}

// ============================================
// INIT
// ============================================

loadChannels();
