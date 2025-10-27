console.log('KNOCK Popup loading...');

// 현재 채팅 중인 룸메이트 정보
let currentRoommate = null;
let currentMessages = [];

// 룸메이트별 대화 내역 (임시 데이터)
const conversations = {
  'Alex': [
    { sender: 'roommate', text: '너 오늘 뭐해? 같이 게임할래?', time: '14:23' }
  ],
  'Emma': [
    { sender: 'roommate', text: '안녕! 오늘 날씨 좋다~', time: '어제' }
  ],
  'James': [
    { sender: 'roommate', text: '좋은 아침! 커피 한 잔 어때?', time: '3일전' }
  ]
};

const roommateEmojis = {
  'Alex': '🎮',
  'Emma': '📚',
  'James': '☕'
};

// 화면 전환 함수
function showListScreen() {
  document.getElementById('chat-screen').classList.remove('active');
  document.querySelector('.header').style.display = 'flex';
  document.querySelector('.content').style.display = 'block';
  document.querySelector('.buttons').style.display = 'flex';
}

function showChatScreen(roommateName) {
  currentRoommate = roommateName;
  currentMessages = conversations[roommateName] || [];

  // 채팅 헤더 업데이트
  document.getElementById('chat-emoji').textContent = roommateEmojis[roommateName];
  document.getElementById('chat-name').textContent = roommateName;

  // 메시지 렌더링
  renderMessages();

  // 화면 전환
  document.querySelector('.header').style.display = 'none';
  document.querySelector('.content').style.display = 'none';
  document.querySelector('.buttons').style.display = 'none';
  document.getElementById('chat-screen').classList.add('active');

  // 입력창 포커스
  document.getElementById('chat-input').focus();
}

// 메시지 렌더링
function renderMessages() {
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.innerHTML = '';

  currentMessages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.sender}`;
    messageDiv.innerHTML = `
      ${msg.text}
      <div class="message-time">${msg.time}</div>
    `;
    messagesContainer.appendChild(messageDiv);
  });

  // 스크롤을 맨 아래로
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 메시지 전송
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();

  if (!text) return;

  // 현재 시간
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  // 사용자 메시지 추가
  currentMessages.push({
    sender: 'user',
    text: text,
    time: time
  });

  renderMessages();
  input.value = '';

  // Mock AI 응답 (1-2초 후)
  setTimeout(() => {
    const responses = [
      '좋아! 그거 재밌겠다!',
      '오 그래? 나도 그렇게 생각해!',
      '헤헤 그치? 나 완전 신났어!',
      '완전 대박이다! 너무 좋아!',
      '진짜? 나도 궁금했어!',
      '오케이~ 그럼 그렇게 하자!',
      '와 진심 좋은데? 해보자!',
      '나도 완전 찬성이야!'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    currentMessages.push({
      sender: 'roommate',
      text: randomResponse,
      time: time
    });

    renderMessages();

    // 대화 내역 저장
    conversations[currentRoommate] = currentMessages;
  }, 1000 + Math.random() * 1000);
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, adding event listeners...');

  // 룸메이트 카드 클릭
  document.getElementById('alex-card').addEventListener('click', function() {
    console.log('Alex clicked!');
    showChatScreen('Alex');
  });

  document.getElementById('emma-card').addEventListener('click', function() {
    console.log('Emma clicked!');
    showChatScreen('Emma');
  });

  document.getElementById('james-card').addEventListener('click', function() {
    console.log('James clicked!');
    showChatScreen('James');
  });

  // 뒤로가기 버튼
  document.getElementById('back-btn').addEventListener('click', function() {
    console.log('Back to list');
    showListScreen();
  });

  // 메시지 전송 버튼
  document.getElementById('send-btn').addEventListener('click', sendMessage);

  // Enter 키로 메시지 전송
  document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // 건물 보기 버튼
  document.getElementById('open-building-btn').addEventListener('click', function() {
    console.log('Opening building view...');
    chrome.tabs.create({ url: 'http://localhost:3002' });
  });

  // 노크하기 버튼
  document.getElementById('knock-btn').addEventListener('click', function() {
    console.log('Knock button clicked!');
    alert('노크 기능 준비중입니다!');
  });

  console.log('All event listeners added successfully!');
});
