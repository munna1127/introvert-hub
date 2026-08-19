const socket = io();
let isLoginMode = false;

let authToken = localStorage.getItem('token');
let currentHandle = localStorage.getItem('username');
let userBattery = localStorage.getItem('battery') || '🔋 Active';
let currentTheme = localStorage.getItem('theme') || 'midnight';

const icebreakers = [
  "What's your current hyperfocus or comfort show?",
  "Gym split today: Push, Pull, or Legs?",
  "Favorite late night work beverage: Coffee or Matcha?",
  "Recommend one album with zero skips.",
  "Which programming language gives you the most peace?"
];

function switchTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  currentTheme = theme;
  const selector = document.getElementById('themeSelector');
  if (selector) selector.value = theme;
}

switchTheme(currentTheme);

socket.emit('join_room', 'lounge_stream');

socket.on('receive_message', (msg) => {
  appendChatMessage(msg.user, msg.text, msg.battery, msg.user === currentHandle);
});

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('signupFields').style.display = isLoginMode ? 'none' : 'block';
  document.getElementById('authSubmitBtn').innerText = isLoginMode ? 'Sign In' : 'Enter Lounge';
  document.getElementById('authToggleText').innerHTML = isLoginMode
    ? 'Need an anonymous handle? <b class="text-indigo-400 hover:underline">Join here</b>'
    : 'Already a member? <b class="text-indigo-400 hover:underline">Log In</b>';
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
      container.innerHTML = `<div class="theme-card p-8 text-center text-xs text-slate-400 rounded-3xl">No signals broadcasted yet. Create the first one!</div>`;
      return;
    }

    container.innerHTML = posts.map(p => `
      <div class="theme-card p-4 sm:p-5 rounded-3xl flex flex-col justify-between gap-3 shadow-lg">
        <div>
          <div class="flex items-center justify-between text-[11px] mb-2">
            <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10 font-medium text-indigo-300">${p.category}</span>
            <span class="text-slate-400 font-medium">@${p.authorName}</span>
          </div>
          <h4 class="font-semibold text-sm leading-snug">${p.title}</h4>
          <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">${p.description}</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
          <span class="text-[10px] text-slate-500 font-mono">${new Date(p.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button onclick="joinDirectChat('${p.authorName}', '${p.title.replace(/'/g, "\\'")}')" class="theme-btn px-3 py-1.5 rounded-xl text-[11px] font-semibold active:scale-95 transition shadow-sm">Sync Request 👋</button>
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
  const prompt = icebreakers[Math.floor(Math.random() * icebreakers.length)];
  document.getElementById('chatInput').value = prompt;
  document.getElementById('promptText').innerText = '🎲 ' + prompt.substring(0, 32) + '...';
}

function joinDirectChat(author, planTitle) {
  const input = document.getElementById('chatInput');
  input.value = `Hey @${author}, down for "${planTitle}". Silent sync?`;
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
    <div class="flex items-center gap-1.5 mb-1 px-1">
      <span class="text-[10px] text-slate-400 font-medium">${isSelf ? 'You' : '@' + user}</span>
      <span class="text-[9px] opacity-70">${battery || ''}</span>
    </div>
    <div class="px-3.5 py-2.5 rounded-2xl max-w-[85%] leading-relaxed text-xs shadow-md ${isSelf ? 'theme-btn rounded-tr-none' : 'theme-card rounded-tl-none'}">
      ${text}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

initView();
