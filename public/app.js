const socket = io();
let isLoginMode = false;

let authToken = localStorage.getItem('token');
let currentHandle = localStorage.getItem('username');

socket.emit('join_room', 'lounge_stream');

socket.on('receive_message', (msg) => {
  appendChatMessage(msg.user, msg.text, msg.user === currentHandle);
});

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('signupFields').style.display = isLoginMode ? 'none' : 'block';
  document.getElementById('authSubmitBtn').innerText = isLoginMode ? 'Sign In' : 'Enter Lounge';
  document.getElementById('authToggleText').innerHTML = isLoginMode
    ? 'Need a quiet handle? <b class="text-indigo-400">Join here</b>'
    : 'Already have a quiet space? <b class="text-indigo-400">Log In</b>';
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPass').value.trim();
  const username = document.getElementById('authUsername').value.trim();

  const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
  const payload = isLoginMode ? { email, password } : { username, email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.msg || 'Authentication failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    authToken = data.token;
    currentHandle = data.username;
    initView();
  } catch (err) {
    alert(err.message);
  }
}

function initView() {
  if (authToken && currentHandle) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('navUser').classList.remove('hidden');
    document.getElementById('navUser').classList.add('flex');
    document.getElementById('userBadge').innerText = `@${currentHandle}`;
    fetchPosts();
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

async function fetchPosts() {
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    const container = document.getElementById('postsFeed');

    if (!posts.length) {
      container.innerHTML = `<div class="glass p-6 text-center text-xs text-slate-500 rounded-2xl">No broadcasts yet. Start a silent wave.</div>`;
      return;
    }

    container.innerHTML = posts.map(p => `
      <div class="glass p-4 rounded-2xl hover:border-white/20 transition group">
        <div class="flex items-center justify-between text-[11px] mb-2">
          <span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-white/5 font-medium">${p.category}</span>
          <span class="text-slate-500">@${p.authorName}</span>
        </div>
        <h4 class="font-semibold text-sm text-slate-100 group-hover:text-indigo-200 transition">${p.title}</h4>
        <p class="text-xs text-slate-400 mt-1 leading-relaxed">${p.description}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function submitPost() {
  const title = document.getElementById('postTitle').value.trim();
  const description = document.getElementById('postDesc').value.trim();
  const category = document.querySelector('input[name="cat"]:checked').value;

  if (!title || !description) return;

  try {
    const res = await fetch('/api/posts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, description, category })
    });

    if (res.ok) {
      document.getElementById('postTitle').value = '';
      document.getElementById('postDesc').value = '';
      fetchPosts();
    }
  } catch (err) {
    console.error(err);
  }
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  socket.emit('send_message', {
    room: 'lounge_stream',
    user: currentHandle,
    text
  });
  input.value = '';
}

function appendChatMessage(user, text, isSelf) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'}`;

  div.innerHTML = `
    <span class="text-[10px] text-slate-500 mb-0.5">${isSelf ? 'You' : '@' + user}</span>
    <div class="px-3 py-2 rounded-xl max-w-[85%] ${isSelf ? 'bg-indigo-600 text-white' : 'glass text-slate-200'}">
      ${text}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

initView();
