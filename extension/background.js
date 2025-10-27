// Background Service Worker for KNOCK Extension
console.log('KNOCK Extension background service worker loaded');

// Load config
let OPENAI_CONFIG = null;

// Try to load config from storage
chrome.storage.local.get(['openai_config'], (result) => {
  if (result.openai_config) {
    OPENAI_CONFIG = result.openai_config;
    console.log('[BG] OpenAI config loaded from storage');
  } else {
    console.warn('[BG] No OpenAI config in storage. Extension will need config from popup.');
  }
});

// OpenAI API call function
async function getAIResponse(userMessage, roommateName) {
  console.log('[BG] Getting AI response for:', userMessage);

  if (!OPENAI_CONFIG || !OPENAI_CONFIG.apiKey) {
    console.error('[BG] No OpenAI config available');
    return '미안, 지금은 대답할 수 없어... 😅';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[BG] OpenAI API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content.trim();
    console.log('[BG] AI response:', aiReply);
    return aiReply;

  } catch (error) {
    console.error('[BG] Failed to get AI response:', error);
    // Fallback responses
    const fallbacks = [
      '오 그래? 재밌겠다!',
      '완전 신나는데! 😆',
      '나도 그렇게 생각해!',
      '헤헤 좋아!',
      '오케이~'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    chrome.storage.local.set({
      userId: null,
      notificationsEnabled: true,
      historyPermission: false,
      knocksRemaining: 1,
    });
    console.log('Extension installed - initial setup complete');
  }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BG] Received message:', message.type);

  switch (message.type) {
    case 'GET_AI_RESPONSE':
      // Handle async AI response
      getAIResponse(message.message, message.roommate || 'Alex')
        .then(reply => {
          sendResponse({ success: true, reply });
        })
        .catch(error => {
          console.error('[BG] Error in GET_AI_RESPONSE:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response

    case 'GET_USER_DATA':
      chrome.storage.local.get(['userId', 'userName'], (data) => {
        sendResponse({ success: true, data });
      });
      return true;

    case 'SHOW_NOTIFICATION':
      chrome.notifications.create({
        type: 'basic',
        title: message.title || 'KNOCK',
        message: message.message || '',
      });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service worker keepalive ping');
  }
});
