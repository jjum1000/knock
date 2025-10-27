// Content Script for KNOCK Extension
console.log('🏠 KNOCK Extension loaded on:', window.location.hostname);

let chatWidget = null;
let chatButton = null;
let isOpen = false;
let currentRoommate = 'Alex';
let messages = [];

// Create floating chat button
function createChatButton() {
  chatButton = document.createElement('div');
  chatButton.id = 'knock-chat-button';
  chatButton.innerHTML = '🏠';
  chatButton.title = 'KNOCK - 룸메이트와 채팅';

  chatButton.addEventListener('click', toggleChat);
  document.body.appendChild(chatButton);

  console.log('💬 KNOCK chat button created');
}

// Create chat widget
function createChatWidget() {
  chatWidget = document.createElement('div');
  chatWidget.id = 'knock-chat-widget';
  chatWidget.style.display = 'none';

  chatWidget.innerHTML = `
    <div class="knock-chat-header">
      <div class="knock-chat-title">
        <span class="knock-emoji">🎮</span>
        <span class="knock-name">Alex</span>
      </div>
      <button class="knock-close-btn" id="knock-close-btn">✕</button>
    </div>

    <div class="knock-chat-messages" id="knock-messages">
      <div class="knock-message knock-roommate">
        <div class="knock-message-text">안녕! 뭐하고 있어?</div>
        <div class="knock-message-time">방금</div>
      </div>
    </div>

    <div class="knock-chat-input-area">
      <input type="text" id="knock-input" class="knock-input" placeholder="메시지 입력..." />
      <button id="knock-send-btn" class="knock-send-btn">▶</button>
    </div>
  `;

  document.body.appendChild(chatWidget);

  // Add event listeners
  document.getElementById('knock-close-btn').addEventListener('click', toggleChat);
  document.getElementById('knock-send-btn').addEventListener('click', sendMessage);
  document.getElementById('knock-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  console.log('💬 KNOCK chat widget created');
}

// Toggle chat widget
function toggleChat() {
  isOpen = !isOpen;

  if (isOpen) {
    chatWidget.style.display = 'flex';
    chatButton.style.display = 'none';
    document.getElementById('knock-input').focus();
  } else {
    chatWidget.style.display = 'none';
    chatButton.style.display = 'flex';
  }
}

// Send message
async function sendMessage() {
  const input = document.getElementById('knock-input');
  const text = input.value.trim();

  if (!text) return;

  console.log('[KNOCK] Sending message:', text);

  // Add user message
  addMessage('user', text);
  input.value = '';

  // Get AI response from background script
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_AI_RESPONSE',
      message: text,
      roommate: currentRoommate
    });

    if (response && response.reply) {
      addMessage('roommate', response.reply);
    } else {
      addMessage('roommate', '음... 잠깐만! 🤔');
    }
  } catch (error) {
    console.error('[KNOCK] Error:', error);
    addMessage('roommate', '앗, 뭔가 문제가 생겼어... 😅');
  }
}

// Add message to chat
function addMessage(sender, text) {
  const messagesContainer = document.getElementById('knock-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `knock-message knock-${sender}`;

  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  messageDiv.innerHTML = `
    <div class="knock-message-text">${text}</div>
    <div class="knock-message-time">${time}</div>
  `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  messages.push({ sender, text, time });
}

// Initialize
function init() {
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createChatButton();
      createChatWidget();
    });
  } else {
    createChatButton();
    createChatWidget();
  }
}

// Start
init();
