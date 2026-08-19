const socket = io();
let isLoginMode = false;

let authToken = localStorage.getItem('token');
let currentHandle = localStorage.getItem('username');
let userBattery = localStorage.getItem('battery') || '🔋 Energized';

const icebreakers = [
  "What is your go-to comfort music right now?",
  "Gym workout focus today: Push, Pull, or Legs?",
  "Favorite coding stack or current side project?",
  "Coffee or green tea for late night focus?",
  "What is the best book/movie you experienced recently?"
];

socket.emit('join_room', 'lounge_stream');

socket.on('receive_message', (msg) => {
  appendChatMessage(msg.user, msg.text, msg.battery, msg.user === currentHandle);
});

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('signupFields').style.display = isLoginMode ? 'none' : 'block';
  document.getElementById('authSubmitBtn').innerText = isLoginMode ? 'Sign In' : 'Enter Lounge';
  document.getElementById('authToggleText').innerHTML = isLoginMode
    ? 'Need a quiet handle? <b class="text-indigo-400">Join here</b>'
    : 'Already a member? <b class="text-indigo-400">Log In</b>';
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

function updateBattery() {
  userBattery = document.getElementById('batteryStatus').value;
  localStorage.setItem('battery', userBattery);
}

function initView() {
  if (authToken && currentHandle) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('navUser').classList.remove('hidden');
    document.getElementById('navUser').classList.add('flex');
    document.getElementById('userBadge').innerText = `@${currentHandle}`;
    document.getElementById('batteryStatus').value = userBattery;
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
      <div class="glass p-4 rounded-2xl hover:border-white/20 transition flex flex-col justify-between gap-3">
        <div>
          <div class="flex items-center justify-between text-[11px] mb-2">
            <span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-white/5 font-medium">${p.category}</span>
            <span class="text-slate-500">@${p.authorName}</span>
          </div>
          <h4 class="font-semibold text-sm text-slate-100">${p.title}</h4>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">${p.description}</p>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          <span class="text-[10px] text-slate-500">${new Date(p.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button onclick="joinDirectChat('${p.authorName}', '${p.title.replace(/'/g, "\\'")}')" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1 rounded-lg transition text-[11px] border border-indigo-500/20">Quiet Sync 👋</button>
        </div>
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

function insertIcebreaker() {
  const randomPrompt = icebreakers[Math.floor(Math.random() * icebreakers.length)];
  document.getElementById('chatInput').value = randomPrompt;
  document.getElementById('promptText').innerText = '🎲 ' + randomPrompt.substring(0, 30) + '...';
}

function joinDirectChat(author, planTitle) {
  const input = document.getElementById('chatInput');
  input.value = `Hey @${author}, saw your plan "${planTitle}". I am down for a quiet sync!`;
  input.focus();
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  socket.emit('send_message', {
    room: 'lounge_stream',
    user: currentHandle,
    battery: userBattery,
    text
  });
  input.value = '';
}

function appendChatMessage(user, text, battery, isSelf) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'}`;

  div.innerHTML = `
    <div class="flex items-center gap-1.5 mb-0.5">
      <span class="text-[10px] text-slate-400 font-medium">${isSelf ? 'You' : '@' + user}</span>
      <span class="text-[9px] text-slate-500">${battery || ''}</span>
    </div>
    <div class="px-3.5 py-2 rounded-2xl max-w-[85%] leading-relaxed ${isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'glass text-slate-200 rounded-tl-none'}">
      ${text}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

initView();
