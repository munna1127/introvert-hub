const socket = io();
let isLoginMode = false;

let authToken = localStorage.getItem('token');
let currentHandle = localStorage.getItem('username');
let activeTarget = 'grp_gym';
let isCurrentGroup = true;

// Tab Routing
function switchTab(tab) {
  const tabs = ['match', 'signals', 'inbox'];
  tabs.forEach(t => {
    document.getElementById(`view${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.add('hidden');
    document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`).className = 'flex-1 py-2 text-xs font-semibold rounded-xl text-slate-400 transition';
  });

  document.getElementById(`view${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('hidden');
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).className = 'flex-1 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white transition';

  if (tab === 'match') fetchMatches();
  if (tab === 'signals') fetchPosts();
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('signupFields').style.display = isLoginMode ? 'none' : 'block';
  document.getElementById('authSubmitBtn').innerText = isLoginMode ? 'Sign In' : 'Enter Lounge';
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPass').value.trim();
  const username = document.getElementById('authUsername')?.value.trim();
  const interest = document.getElementById('authInterest')?.value;
  const location = document.getElementById('authLocation')?.value.trim() || 'Online';

  const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
  const payload = isLoginMode ? { email, password } : { username, email, password, interest, location };

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

    socket.emit('join_user', currentHandle);
    socket.emit('join_group', 'grp_gym');
    socket.emit('join_group', 'grp_code');

    fetchMatches();
    openChat('grp_gym', '💪 Gym Silent Squad', true);
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

// Discover Tinder-like Matches
async function fetchMatches() {
  try {
    const res = await fetch('/api/match/discover', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const matches = await res.json();
    const deck = document.getElementById('matchCardDeck');

    if (!matches.length) {
      deck.innerHTML = `<div class="theme-card p-6 text-center text-xs text-slate-400 rounded-3xl">Searching for calm souls nearby...</div>`;
      return;
    }

    deck.innerHTML = matches.map(m => `
      <div class="theme-card p-5 rounded-3xl space-y-4 shadow-xl border border-white/10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-bold text-sm text-indigo-300">
              ${m.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 class="font-bold text-sm">@${m.username}</h4>
              <p class="text-[10px] text-slate-400">📍 ${m.location || 'Online'} • ${m.interest || 'Chill'}</p>
            </div>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Silent Mode</span>
        </div>

        <p class="text-xs text-slate-300 bg-white/5 p-3 rounded-2xl">${m.bio || 'Looking for low-friction quiet connection.'}</p>

        <div class="flex gap-2">
          <button onclick="startPrivateDM('${m.username}')" class="flex-1 theme-btn py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <span>⚡ Direct Quiet Sync</span>
          </button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

// Direct Chat & Messaging
async function openChat(target, title, isGroup) {
  activeTarget = target;
  isCurrentGroup = isGroup;
  document.getElementById('activeChatTitle').innerText = title;
  document.getElementById('activeChatSub').innerText = isGroup ? 'Public Quiet Space' : 'Private Direct Connection';

  try {
    const res = await fetch(`/api/match/messages/${target}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const msgs = await res.json();
    const box = document.getElementById('chatMessages');
    box.innerHTML = '';
    msgs.forEach(m => appendChatMessage(m.sender, m.text, m.sender === currentHandle));
  } catch (e) {
    console.error(e);
  }
}

function startPrivateDM(username) {
  switchTab('inbox');
  const dmList = document.getElementById('directChatList');
  dmList.innerHTML = `
    <button onclick="openChat('${username}', '@${username}', false)" class="w-full text-left p-2 rounded-xl text-xs bg-white/10 text-indigo-300 font-medium">
      @${username} (Active DM)
    </button>
  `;
  openChat(username, `@${username}`, false);
}

function sendDirectMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  socket.emit('send_direct_message', {
    sender: currentHandle,
    recipient: activeTarget,
    text,
    isGroup: isCurrentGroup
  });

  input.value = '';
}

socket.on('receive_direct_message', (msg) => {
  if (
    (isCurrentGroup && msg.recipient === activeTarget) ||
    (!isCurrentGroup && (msg.sender === activeTarget || msg.recipient === activeTarget))
  ) {
    appendChatMessage(msg.sender, msg.text, msg.sender === currentHandle);
  }
});

function appendChatMessage(sender, text, isSelf) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'}`;

  div.innerHTML = `
    <span class="text-[9px] text-slate-500 mb-0.5">${isSelf ? 'You' : '@' + sender}</span>
    <div class="px-3.5 py-2 rounded-2xl max-w-[80%] text-xs ${isSelf ? 'theme-btn rounded-tr-none' : 'theme-card rounded-tl-none'}">
      ${text}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Signals Post System
async function fetchPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const feed = document.getElementById('postsFeed');
  feed.innerHTML = posts.map(p => `
    <div class="theme-card p-4 rounded-3xl space-y-2">
      <div class="flex justify-between text-[11px] text-slate-400">
        <span class="text-indigo-300 font-medium">${p.category}</span>
        <span>@${p.authorName}</span>
      </div>
      <h4 class="font-bold text-sm">${p.title}</h4>
      <p class="text-xs text-slate-400">${p.description}</p>
      <button onclick="startPrivateDM('${p.authorName}')" class="text-[11px] theme-btn px-3 py-1 rounded-lg mt-2">Private DM 👋</button>
    </div>
  `).join('');
}

async function submitPost() {
  const title = document.getElementById('postTitle').value.trim();
  const description = document.getElementById('postDesc').value.trim();
  if (!title || !description) return;

  await fetch('/api/posts/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
    body: JSON.stringify({ title, description, category: 'Quiet Sync' })
  });

  document.getElementById('postTitle').value = '';
  document.getElementById('postDesc').value = '';
  fetchPosts();
}

initView();
