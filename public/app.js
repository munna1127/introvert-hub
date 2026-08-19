const socket = io();
let isLoginMode = false;

let authToken = localStorage.getItem('token');
let currentHandle = (localStorage.getItem('username') || '').replace('@', '').trim();
let activeTarget = 'grp_general';
let matchDeck = [];
let currentDeckIndex = 0;
let lastMatchedUser = '';

function switchTab(tab) {
  ['match', 'inbox', 'signals'].forEach(t => {
    document.getElementById(`view${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.add('hidden');
    document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`).className = 'flex-1 py-2 text-xs font-bold rounded-xl text-slate-400 transition';
  });

  document.getElementById(`view${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('hidden');
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).className = 'flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white transition';

  if (tab === 'match') renderCurrentCard();
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
  const rawUsername = document.getElementById('authUsername')?.value.trim() || '';
  const username = rawUsername.replace('@', '');
  const interest = document.getElementById('authInterest')?.value || 'Gym';
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
    if (!res.ok) throw new Error(data.msg || 'Auth Failed');

    const cleanUser = data.username.replace('@', '');
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', cleanUser);
    authToken = data.token;
    currentHandle = cleanUser;
    initView();
  } catch (err) {
    alert(err.message);
  }
}

function initView() {
  if (authToken && currentHandle) {
    currentHandle = currentHandle.replace('@', '');
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('navUser').classList.remove('hidden');
    document.getElementById('navUser').classList.add('flex');
    document.getElementById('userBadge').innerText = `@${currentHandle}`;

    socket.emit('join_user', currentHandle);
    socket.emit('join_group', 'grp_general');

    loadConversations();
    fetchMatches();
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

// Swipe Match Deck
async function fetchMatches() {
  try {
    const res = await fetch('/api/match/discover', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    matchDeck = await res.json();
    currentDeckIndex = 0;
    renderCurrentCard();
  } catch (e) {
    console.error(e);
  }
}

function renderCurrentCard() {
  const container = document.getElementById('cardStackContainer');
  if (!matchDeck.length || currentDeckIndex >= matchDeck.length) {
    container.innerHTML = `
      <div class="glass-card p-6 rounded-3xl text-center space-y-2">
        <span class="text-3xl">🌿</span>
        <h4 class="font-bold text-sm">Quiet Zone Clear</h4>
        <p class="text-xs text-slate-400">No other users nearby right now.</p>
        <button onclick="fetchMatches()" class="text-xs bg-indigo-600 px-4 py-2 rounded-xl mt-2">Refresh Radar</button>
      </div>`;
    return;
  }

  const user = matchDeck[currentDeckIndex];
  container.innerHTML = `
    <div id="swipeCard" class="w-full h-full glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-2xl relative overflow-hidden">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">🎯 ${user.interest || 'Silent Sync'}</span>
          <span class="text-xs text-slate-400">📍 ${user.location || 'Online'}</span>
        </div>
        <div class="pt-6">
          <h2 class="text-2xl font-extrabold text-white">@${user.username}</h2>
          <p class="text-xs text-emerald-400 font-medium mt-0.5">⚡ Silent Energy Match</p>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed bg-white/5 p-4 rounded-2xl">${user.bio || 'Prefers low-friction interactions. Zero awkward small talk.'}</p>
      </div>
      <div class="text-[10px] text-slate-500 text-center font-mono">Swipe or tap ⚡ to Sync</div>
    </div>
  `;
}

function swipeAction(type) {
  if (currentDeckIndex >= matchDeck.length) return;
  const user = matchDeck[currentDeckIndex];
  const card = document.getElementById('swipeCard');

  if (card) {
    card.style.transform = type === 'match' ? 'translateX(120px) rotate(15deg)' : 'translateX(-120px) rotate(-15deg)';
    card.style.opacity = '0';
  }

  setTimeout(() => {
    if (type === 'match') {
      lastMatchedUser = user.username;
      document.getElementById('matchPopupText').innerText = `You and @${user.username} unlocked silent connection.`;
      document.getElementById('matchPopup').classList.remove('hidden');
      saveDM(user.username);
    }
    currentDeckIndex++;
    renderCurrentCard();
  }, 250);
}

function openMatchedChat() {
  document.getElementById('matchPopup').classList.add('hidden');
  switchTab('inbox');
  openChat(lastMatchedUser);
}

function saveDM(username) {
  const clean = username.replace('@', '').trim();
  let dms = JSON.parse(localStorage.getItem('saved_dms') || '[]');
  if (!dms.includes(clean)) {
    dms.push(clean);
    localStorage.setItem('saved_dms', JSON.stringify(dms));
  }
  loadConversations();
}

function loadConversations() {
  const dms = JSON.parse(localStorage.getItem('saved_dms') || '[]');
  const list = document.getElementById('dmConversationList');

  list.innerHTML = `
    <button onclick="openChat('grp_general')" class="px-3 py-1.5 rounded-xl text-xs whitespace-nowrap ${activeTarget === 'grp_general' ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300'}">
      🌐 Lounge Squad
    </button>
  ` + dms.map(u => `
    <button onclick="openChat('${u}')" class="px-3 py-1.5 rounded-xl text-xs whitespace-nowrap ${activeTarget === u ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300'}">
      @${u}
    </button>
  `).join('');
}

// Chat Engine
async function openChat(target) {
  activeTarget = target.replace('@', '').trim();
  document.getElementById('activeChatTitle').innerText = activeTarget.startsWith('grp_') ? '🌐 Lounge Squad' : `@${activeTarget}`;
  loadConversations();

  const box = document.getElementById('chatMessages');
  box.innerHTML = '<div class="text-[10px] text-slate-500 text-center py-2">Loading silent sync...</div>';

  try {
    const res = await fetch(`/api/match/messages/${activeTarget}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const msgs = await res.json();
    box.innerHTML = '';
    if (msgs.length === 0) {
      box.innerHTML = '<div class="text-[10px] text-slate-500 text-center py-4">No messages yet. Send a quiet wave 👋</div>';
    } else {
      msgs.forEach(m => appendChatMessage(m.sender, m.text, m.sender === currentHandle));
    }
  } catch (e) {
    box.innerHTML = '<div class="text-[10px] text-rose-400 text-center py-2">Failed to load messages</div>';
  }
}

function sendDirectMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const isGroup = activeTarget.startsWith('grp_');

  // Optimistic UI Append
  appendChatMessage(currentHandle, text, true);

  socket.emit('send_direct_message', {
    sender: currentHandle,
    recipient: activeTarget,
    text,
    isGroup
  });

  input.value = '';
}

socket.on('receive_direct_message', (msg) => {
  const cleanSender = msg.sender.replace('@', '').trim();
  const cleanRecipient = msg.recipient.replace('@', '').trim();
  const isGroup = activeTarget.startsWith('grp_');

  // Skip self duplicate because of optimistic UI
  if (cleanSender === currentHandle && !isGroup) return;

  if (isGroup && cleanRecipient === activeTarget) {
    if (cleanSender !== currentHandle) {
      appendChatMessage(cleanSender, msg.text, false);
    }
  } else if (!isGroup) {
    if (cleanSender === activeTarget && cleanRecipient === currentHandle) {
      appendChatMessage(cleanSender, msg.text, false);
    }
  }
});

function appendChatMessage(sender, text, isSelf) {
  const container = document.getElementById('chatMessages');
  
  // Remove placeholder if present
  if (container.innerText.includes('No messages yet') || container.innerText.includes('Loading')) {
    container.innerHTML = '';
  }

  const div = document.createElement('div');
  div.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'}`;

  div.innerHTML = `
    <span class="text-[9px] text-slate-500 mb-0.5">${isSelf ? 'You' : '@' + sender}</span>
    <div class="px-3.5 py-2 rounded-2xl max-w-[80%] text-xs leading-relaxed ${isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'glass-card text-slate-200 rounded-tl-none'}">
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
    <div class="glass-card p-4 rounded-2xl space-y-2">
      <div class="flex justify-between text-[11px] text-slate-400">
        <span class="text-indigo-300 font-bold">${p.category}</span>
        <span>@${p.authorName}</span>
      </div>
      <h4 class="font-bold text-sm">${p.title}</h4>
      <p class="text-xs text-slate-400">${p.description}</p>
      <button onclick="saveDM('${p.authorName}'); openChat('${p.authorName}')" class="text-[11px] bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-xl">Silent DM 👋</button>
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
