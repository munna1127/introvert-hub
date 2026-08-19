const socket = io();
const API_URL = '/api';

let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('username');

socket.emit('join_room', 'global_lounge');

socket.on('receive_message', (data) => {
  const box = document.getElementById('chatBox');
  box.innerHTML += `<div class="p-1"><span class="font-bold text-indigo-400">${data.user}:</span> ${data.text}</div>`;
  box.scrollTop = box.scrollHeight;
});

function checkAuth() {
  if (token && currentUser) {
    document.getElementById('authBox').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('userBadge').innerText = `@${currentUser}`;
    loadPosts();
  }
}

async function register() {
  const username = document.getElementById('authUsername').value;
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPass').value;

  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    token = data.token;
    currentUser = data.username;
    checkAuth();
  } else {
    alert(data.message || 'Error occurred');
  }
}

async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPass').value;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    token = data.token;
    currentUser = data.username;
    checkAuth();
  } else {
    alert(data.message || 'Error occurred');
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

async function loadPosts() {
  const res = await fetch(`${API_URL}/posts`);
  const posts = await res.json();
  const list = document.getElementById('postsList');
  list.innerHTML = posts.map(p => `
    <div class="bg-slate-800 p-3 rounded-lg border border-slate-700">
      <div class="flex justify-between text-xs text-slate-400">
        <span class="bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded">${p.category}</span>
        <span>by @${p.authorName}</span>
      </div>
      <h4 class="font-bold text-md mt-1 text-slate-200">${p.title}</h4>
      <p class="text-xs text-slate-400 mt-1">${p.description}</p>
    </div>
  `).join('');
}

async function createPost() {
  const title = document.getElementById('postTitle').value;
  const description = document.getElementById('postDesc').value;
  const category = document.getElementById('category').value;

  const res = await fetch(`${API_URL}/posts/create`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title, description, category, authorName: currentUser })
  });

  if (res.ok) {
    document.getElementById('postTitle').value = '';
    document.getElementById('postDesc').value = '';
    loadPosts();
  }
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input.value.trim()) return;
  socket.emit('send_message', { room: 'global_lounge', user: currentUser, text: input.value });
  input.value = '';
}

checkAuth();
