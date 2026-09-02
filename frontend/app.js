// The backend URL is injected via window.CHAT_API_URL if you need to override it
// (e.g. from an nginx-served config.js in your docker setup). Defaults to localhost:4000.
const API_URL = window.CHAT_API_URL || 'http://localhost:4000';
const ROOM = 'general';

const socket = io(API_URL, { transports: ['websocket', 'polling'] });

let username = '';

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const statusEl = document.getElementById('status');
const whoamiEl = document.getElementById('whoami');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

socket.on('connect', () => { statusEl.textContent = 'подключено к серверу'; });
socket.on('connect_error', (err) => { statusEl.textContent = 'нет соединения с backend: ' + err.message; });

joinBtn.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name) return;
  username = name;
  whoamiEl.textContent = username;
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  socket.emit('join_room', ROOM);
  await loadHistory();
  messageInput.focus();
});

usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});

async function loadHistory() {
  try {
    const res = await fetch(`${API_URL}/api/messages/${ROOM}`);
    const data = await res.json();
    data.forEach(renderMessage);
  } catch (err) {
    console.error('Failed to load history', err);
  }
}

function renderMessage({ username: user, content }) {
  const el = document.createElement('div');
  el.className = 'message';
  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = user + ':';
  el.appendChild(who);
  el.appendChild(document.createTextNode(content));
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;
  socket.emit('send_message', { username, room: ROOM, content });
  messageInput.value = '';
});

socket.on('receive_message', renderMessage);
