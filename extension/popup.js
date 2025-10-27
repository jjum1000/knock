console.log('KNOCK Popup loading...');

// 현재 채팅 중인 룸메이트 정보
let currentRoommate = null;
let currentMessages = [];

// 룸메이트별 대화 내역 (임시 데이터 - Firebase 연결 실패 시 사용)
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

// OpenAI API 호출
async function getAIResponse(userMessage, roommateName) {
  console.log('[AI] Requesting response for:', userMessage);

  if (!window.OPENAI_CONFIG) {
    console.error('[AI] OpenAI config not available!');
    return getMockResponse();
  }

  console.log('[AI] API Key exists:', !!window.OPENAI_CONFIG.apiKey);
  console.log('[AI] Model:', window.OPENAI_CONFIG.model);

  try {
    console.log('[AI] Calling OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.OPENAI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: window.OPENAI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: `너는 ${roommateName}라는 이름의 친근한 룸메이트야. 짧고 자연스러운 한국어로 대화해줘. 이모티콘이나 채팅 스타일로 편하게 얘기해. 한 문장에서 두 문장 정도로 짧게 답변해.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    console.log('[AI] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[AI] API Error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('[AI] Success! Response:', data.choices[0].message.content);
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[AI] API call failed:', error);
    console.log('[AI] Using mock response as fallback');
    return getMockResponse();
  }
}

// Mock 응답 (API 실패 시 사용)
function getMockResponse() {
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
  return responses[Math.floor(Math.random() * responses.length)];
}

// 메시지 전송
async function sendMessage() {
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

  // AI 응답 받기
  try {
    const aiResponse = await getAIResponse(text, currentRoommate);

    currentMessages.push({
      sender: 'roommate',
      text: aiResponse,
      time: time
    });

    renderMessages();

    // 대화 내역 저장
    conversations[currentRoommate] = currentMessages;
  } catch (error) {
    console.error('Error sending message:', error);
  }
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
