const socket = io();

const i18n = {
  en: {
    title: 'AnonChat',
    subtitle: 'Anonymous messenger · No registration',
    nicknamePlaceholder: 'Enter your nickname...',
    join: 'Join',
    hint: 'A unique ID will be generated for you automatically',
    searchPlaceholder: 'Search users or chats...',
    noChat: 'Select a chat or start a new conversation',
    typeMessage: 'Type a message...',
    cancel: 'Cancel',
    ok: 'OK',
    newGroup: 'Create Group',
    newChannel: 'Create Channel',
    groupName: 'Group name',
    channelName: 'Channel name',
    searchUser: 'Search by ID or nickname',
    startChat: 'Start Chat',
    invite: 'Invite user by ID',
    online: 'online',
    offline: 'offline',
    private: 'private',
    group: 'group',
    channel: 'channel',
    onlyOwner: 'Only channel owner can post messages',
    joined: 'You joined!',
    error: 'Error',
    copyId: 'Your ID copied!',
    noResults: 'No users found'
  },
  fa: {
    title: 'AnonChat',
    subtitle: 'پیام‌رسان ناشناس · بدون ثبت‌نام',
    nicknamePlaceholder: 'نام مستعار خود را وارد کنید...',
    join: 'ورود',
    hint: 'یک آیدی یکتا به صورت خودکار برای شما ساخته می‌شود',
    searchPlaceholder: 'جستجوی کاربر یا گفتگو...',
    noChat: 'یک گفتگو انتخاب کنید یا گفتگوی جدید شروع کنید',
    typeMessage: 'پیام خود را بنویسید...',
    cancel: 'لغو',
    ok: 'تأیید',
    newGroup: 'ساخت گروه',
    newChannel: 'ساخت کانال',
    groupName: 'نام گروه',
    channelName: 'نام کانال',
    searchUser: 'جستجو با آیدی یا نام مستعار',
    startChat: 'شروع گفتگو',
    invite: 'دعوت کاربر با آیدی',
    online: 'آنلاین',
    offline: 'آفلاین',
    private: 'خصوصی',
    group: 'گروه',
    channel: 'کانال',
    onlyOwner: 'فقط صاحب کانال می‌تواند پیام بفرستد',
    joined: 'وارد شدید!',
    error: 'خطا',
    copyId: 'آیدی شما کپی شد!',
    noResults: 'کاربری یافت نشد'
  }
};

let lang = localStorage.getItem('anonchat_lang') || 'en';
let me = null;
let currentChatId = null;
let currentChatType = null;
let chatsCache = [];

const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const nicknameInput = document.getElementById('nickname-input');
const joinBtn = document.getElementById('join-btn');
const langEn = document.getElementById('lang-en');
const langFa = document.getElementById('lang-fa');
const myName = document.getElementById('my-name');
const myId = document.getElementById('my-id');
const myAvatar = document.getElementById('my-avatar');
const chatListEl = document.getElementById('chat-list');
const searchInput = document.getElementById('search-input');
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatView = document.getElementById('chat-view');
const noChat = document.getElementById('no-chat');
const chatTitle = document.getElementById('chat-title');
const chatSubtitle = document.getElementById('chat-subtitle');
const sidebar = document.getElementById('sidebar');
const backBtn = document.getElementById('back-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const toastEl = document.getElementById('toast');

function t(key) {
  return i18n[lang][key] || i18n.en[key] || key;
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  document.getElementById('login-title').textContent = t('title');
  document.getElementById('login-subtitle').textContent = t('subtitle');
  nicknameInput.placeholder = t('nicknamePlaceholder');
  joinBtn.textContent = t('join');
  document.getElementById('login-hint').textContent = t('hint');
  searchInput.placeholder = t('searchPlaceholder');
  document.getElementById('no-chat-text').textContent = t('noChat');
  messageInput.placeholder = t('typeMessage');
  modalCancel.textContent = t('cancel');
  modalConfirm.textContent = t('ok');
  langEn.classList.toggle('active', lang === 'en');
  langFa.classList.toggle('active', lang === 'fa');
  localStorage.setItem('anonchat_lang', lang);
}

langEn.onclick = () => { lang = 'en'; applyLang(); };
langFa.onclick = () => { lang = 'fa'; applyLang(); };
applyLang();

joinBtn.onclick = () => {
  const nick = nicknameInput.value.trim();
  if (nick.length < 2) {
    showToast(lang === 'fa' ? 'نام مستعار خیلی کوتاه است' : 'Nickname too short');
    return;
  }
  socket.emit('join', { nickname: nick, lang });
};

nicknameInput.onkeydown = (e) => {
  if (e.key === 'Enter') joinBtn.click();
};

socket.on('joined', (data) => {
  me = data;
  myName.textContent = me.nickname;
  myId.textContent = '@' + me.id;
  myAvatar.textContent = me.nickname.charAt(0).toUpperCase();
  loginScreen.classList.remove('active');
  mainScreen.classList.add('active');
  showToast(t('joined'));
  socket.emit('getChatList');
});

socket.on('error', (data) => {
  showToast(data.message || t('error'));
});

socket.on('chatListUpdate', (list) => {
  chatsCache = list;
  renderChatList(list);
});

socket.on('chatOpened', (data) => {
  currentChatId = data.chatId;
  currentChatType = data.type;
  chatTitle.textContent = data.name;
  chatSubtitle.textContent = t(data.type);
  noChat.style.display = 'none';
  chatView.style.display = 'flex';
  messagesEl.innerHTML = '';
  (data.messages || []).forEach(m => appendMessage(m));
  scrollToBottom();
  if (window.innerWidth <= 768) {
    sidebar.classList.add('hidden');
  }
  document.querySelectorAll('.chat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.chatId === data.chatId);
  });
});

socket.on('newMessage', (msg) => {
  if (msg.chatId === currentChatId) {
    appendMessage(msg);
    scrollToBottom();
  }
  socket.emit('getChatList');
});

socket.on('searchResults', (results) => {
  renderSearchResults(results);
});

socket.on('invited', (data) => {
  showToast((lang === 'fa' ? 'به ' : 'Invited to ') + data.name);
  socket.emit('getChatList');
});

function renderChatList(list) {
  chatListEl.innerHTML = '';
  if (!list.length) {
    chatListEl.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-secondary);font-size:0.9rem;">${t('noChat')}</div>`;
    return;
  }
  list.forEach(c => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (c.chatId === currentChatId ? ' active' : '');
    el.dataset.chatId = c.chatId;
    const initial = (c.name || '?').charAt(0).toUpperCase();
    el.innerHTML = `
      <div class="avatar">${initial}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHtml(c.name)} <span class="chat-item-type">${t(c.type)}</span></div>
        <div class="chat-item-last">${escapeHtml(c.lastMessage || '')}</div>
      </div>
    `;
    el.onclick = () => {
      socket.emit('joinChatById', { chatId: c.chatId });
    };
    chatListEl.appendChild(el);
  });
}

function renderSearchResults(results) {
  chatListEl.innerHTML = '';
  if (!results.length) {
    chatListEl.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-secondary);">${t('noResults')}</div>`;
    return;
  }
  results.forEach(u => {
    const el = document.createElement('div');
    el.className = 'chat-item';
    el.innerHTML = `
      <div class="avatar">${u.nickname.charAt(0).toUpperCase()}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHtml(u.nickname)}</div>
        <div class="chat-item-last">@${u.id} · ${u.online ? t('online') : t('offline')}</div>
      </div>
    `;
    el.onclick = () => {
      socket.emit('startPrivateChat', { targetId: u.id });
      searchInput.value = '';
    };
    chatListEl.appendChild(el);
  });
}

searchInput.oninput = () => {
  const q = searchInput.value.trim();
  if (q.length >= 1) {
    socket.emit('searchUser', { query: q });
  } else {
    renderChatList(chatsCache);
  }
};

function appendMessage(msg) {
  const isOut = msg.senderId === me.id;
  const div = document.createElement('div');
  div.className = 'message ' + (isOut ? 'out' : 'in');
  const time = new Date(msg.timestamp).toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  let html = '';
  if (!isOut && currentChatType !== 'private') {
    html += `<div class="sender">${escapeHtml(msg.senderNickname)}</div>`;
  }
  html += `<div>${escapeHtml(msg.text)}</div><div class="time">${time}</div>`;
  div.innerHTML = html;
  messagesEl.appendChild(div);
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

sendBtn.onclick = sendMessage;
messageInput.onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChatId) return;
  socket.emit('sendMessage', { chatId: currentChatId, text });
  messageInput.value = '';
}

backBtn.onclick = () => {
  sidebar.classList.remove('hidden');
  currentChatId = null;
};

document.getElementById('new-chat-btn').onclick = () => {
  showModal(t('searchUser'), '', (val) => {
    if (val) {
      socket.emit('searchUser', { query: val });
      searchInput.value = val;
    }
  });
};

document.getElementById('new-group-btn').onclick = () => {
  showModal(t('newGroup'), t('groupName'), (val) => {
    if (val && val.trim().length >= 2) {
      socket.emit('createGroup', { name: val.trim() });
    }
  });
};

document.getElementById('new-channel-btn').onclick = () => {
  showModal(t('newChannel'), t('channelName'), (val) => {
    if (val && val.trim().length >= 2) {
      socket.emit('createChannel', { name: val.trim() });
    }
  });
};

myId.onclick = () => {
  navigator.clipboard.writeText(me.id).then(() => showToast(t('copyId')));
};

function showModal(title, placeholder, onConfirm) {
  modalTitle.textContent = title;
  modalInput.placeholder = placeholder || '';
  modalInput.value = '';
  modalOverlay.style.display = 'flex';
  modalInput.focus();
  const confirm = () => {
    modalOverlay.style.display = 'none';
    onConfirm(modalInput.value);
    modalConfirm.onclick = null;
    modalCancel.onclick = null;
  };
  modalConfirm.onclick = confirm;
  modalCancel.onclick = () => { modalOverlay.style.display = 'none'; };
  modalInput.onkeydown = (e) => { if (e.key === 'Enter') confirm(); };
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
