const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory store (for temporary server)
const users = new Map(); // id -> { id, nickname, socketId, lang }
const chats = new Map(); // chatId -> { id, type: 'private'|'group'|'channel', name, members: Set, messages: [], creator }
const userChats = new Map(); // userId -> Set of chatIds

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateChatId() {
  return 'c_' + Math.random().toString(36).substring(2, 12);
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join', ({ nickname, lang }) => {
    if (!nickname || nickname.trim().length < 2) {
      socket.emit('error', { message: lang === 'fa' ? 'نام مستعار باید حداقل ۲ کاراکتر باشد' : 'Nickname must be at least 2 characters' });
      return;
    }
    const id = generateId();
    const user = {
      id,
      nickname: nickname.trim().slice(0, 32),
      socketId: socket.id,
      lang: lang === 'fa' ? 'fa' : 'en',
      online: true
    };
    users.set(id, user);
    userChats.set(id, new Set());
    socket.userId = id;
    socket.join(id);
    socket.emit('joined', { id, nickname: user.nickname, lang: user.lang });
    console.log(`User joined: ${user.nickname} (@${id})`);
  });

  socket.on('searchUser', ({ query }) => {
    if (!socket.userId) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) return;
    const results = [];
    for (const [id, u] of users) {
      if (id === socket.userId) continue;
      if (id.includes(q) || u.nickname.toLowerCase().includes(q)) {
        results.push({ id: u.id, nickname: u.nickname, online: u.online });
      }
      if (results.length >= 10) break;
    }
    socket.emit('searchResults', results);
  });

  socket.on('startPrivateChat', ({ targetId }) => {
    if (!socket.userId || !users.has(targetId)) {
      socket.emit('error', { message: 'User not found' });
      return;
    }
    let chatId = null;
    for (const [cid, chat] of chats) {
      if (chat.type === 'private' && chat.members.has(socket.userId) && chat.members.has(targetId)) {
        chatId = cid;
        break;
      }
    }
    if (!chatId) {
      chatId = generateChatId();
      const members = new Set([socket.userId, targetId]);
      chats.set(chatId, {
        id: chatId,
        type: 'private',
        name: null,
        members,
        messages: [],
        creator: socket.userId
      });
      userChats.get(socket.userId).add(chatId);
      if (userChats.has(targetId)) userChats.get(targetId).add(chatId);
    }
    const chat = chats.get(chatId);
    const other = users.get(targetId);
    socket.emit('chatOpened', {
      chatId,
      type: 'private',
      name: other ? other.nickname : targetId,
      targetId,
      messages: chat.messages.slice(-50)
    });
    socket.join(chatId);
  });

  socket.on('createGroup', ({ name }) => {
    if (!socket.userId || !name || name.trim().length < 2) {
      socket.emit('error', { message: 'Invalid group name' });
      return;
    }
    const chatId = generateChatId();
    const members = new Set([socket.userId]);
    chats.set(chatId, {
      id: chatId,
      type: 'group',
      name: name.trim().slice(0, 50),
      members,
      messages: [],
      creator: socket.userId
    });
    userChats.get(socket.userId).add(chatId);
    socket.join(chatId);
    socket.emit('chatOpened', {
      chatId,
      type: 'group',
      name: name.trim(),
      messages: []
    });
    socket.emit('chatListUpdate', getUserChatList(socket.userId));
  });

  socket.on('createChannel', ({ name }) => {
    if (!socket.userId || !name || name.trim().length < 2) {
      socket.emit('error', { message: 'Invalid channel name' });
      return;
    }
    const chatId = generateChatId();
    const members = new Set([socket.userId]);
    chats.set(chatId, {
      id: chatId,
      type: 'channel',
      name: name.trim().slice(0, 50),
      members,
      messages: [],
      creator: socket.userId
    });
    userChats.get(socket.userId).add(chatId);
    socket.join(chatId);
    socket.emit('chatOpened', {
      chatId,
      type: 'channel',
      name: name.trim(),
      messages: []
    });
    socket.emit('chatListUpdate', getUserChatList(socket.userId));
  });

  socket.on('joinChatById', ({ chatId }) => {
    if (!socket.userId || !chats.has(chatId)) {
      socket.emit('error', { message: 'Chat not found' });
      return;
    }
    const chat = chats.get(chatId);
    chat.members.add(socket.userId);
    userChats.get(socket.userId).add(chatId);
    socket.join(chatId);
    socket.emit('chatOpened', {
      chatId,
      type: chat.type,
      name: chat.name || chatId,
      messages: chat.messages.slice(-50)
    });
    socket.emit('chatListUpdate', getUserChatList(socket.userId));
  });

  socket.on('sendMessage', ({ chatId, text }) => {
    if (!socket.userId || !chats.has(chatId) || !text || !text.trim()) return;
    const chat = chats.get(chatId);
    if (!chat.members.has(socket.userId)) return;
    if (chat.type === 'channel' && chat.creator !== socket.userId) {
      socket.emit('error', { message: 'Only channel owner can post' });
      return;
    }
    const user = users.get(socket.userId);
    const msg = {
      id: uuidv4(),
      chatId,
      senderId: socket.userId,
      senderNickname: user.nickname,
      text: text.trim().slice(0, 2000),
      timestamp: Date.now()
    };
    chat.messages.push(msg);
    if (chat.messages.length > 500) chat.messages.shift();
    io.to(chatId).emit('newMessage', msg);
  });

  socket.on('getChatList', () => {
    if (!socket.userId) return;
    socket.emit('chatListUpdate', getUserChatList(socket.userId));
  });

  socket.on('getChatMessages', ({ chatId }) => {
    if (!socket.userId || !chats.has(chatId)) return;
    const chat = chats.get(chatId);
    if (!chat.members.has(socket.userId)) return;
    socket.emit('chatMessages', {
      chatId,
      messages: chat.messages.slice(-100)
    });
  });

  socket.on('inviteToGroup', ({ chatId, targetId }) => {
    if (!socket.userId || !chats.has(chatId) || !users.has(targetId)) return;
    const chat = chats.get(chatId);
    if (chat.type !== 'group' && chat.type !== 'channel') return;
    if (!chat.members.has(socket.userId)) return;
    chat.members.add(targetId);
    if (userChats.has(targetId)) userChats.get(targetId).add(chatId);
    const targetSocket = [...io.sockets.sockets.values()].find(s => s.userId === targetId);
    if (targetSocket) {
      targetSocket.join(chatId);
      targetSocket.emit('chatListUpdate', getUserChatList(targetId));
      targetSocket.emit('invited', { chatId, name: chat.name, type: chat.type });
    }
    socket.emit('inviteSuccess', { targetId });
  });

  socket.on('disconnect', () => {
    if (socket.userId && users.has(socket.userId)) {
      const u = users.get(socket.userId);
      u.online = false;
      u.socketId = null;
      console.log(`User disconnected: ${u.nickname}`);
    }
  });
});

function getUserChatList(userId) {
  const list = [];
  const chatIds = userChats.get(userId) || new Set();
  for (const cid of chatIds) {
    const chat = chats.get(cid);
    if (!chat) continue;
    let displayName = chat.name;
    if (chat.type === 'private') {
      const otherId = [...chat.members].find(m => m !== userId);
      const other = users.get(otherId);
      displayName = other ? other.nickname : otherId;
    }
    const lastMsg = chat.messages[chat.messages.length - 1];
    list.push({
      chatId: cid,
      type: chat.type,
      name: displayName,
      lastMessage: lastMsg ? lastMsg.text.slice(0, 40) : '',
      lastTime: lastMsg ? lastMsg.timestamp : 0,
      unread: 0
    });
  }
  list.sort((a, b) => b.lastTime - a.lastTime);
  return list;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AnonMessenger running on http://localhost:${PORT}`);
});
