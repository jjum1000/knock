// Background Service Worker for KNOCK Extension
console.log('KNOCK Extension background service worker loaded')

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason)

  if (details.reason === 'install') {
    // First time installation
    chrome.storage.local.set({
      userId: null,
      notificationsEnabled: true,
      historyPermission: false,
      knocksRemaining: 1,
    })

    console.log('Extension installed - initial setup complete')
  }
})

// Message listener for popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message)

  switch (message.type) {
    case 'GET_USER_DATA':
      chrome.storage.local.get(['userId', 'userName'], (data) => {
        sendResponse({ success: true, data })
      })
      return true // Keep channel open for async response

    case 'SHOW_NOTIFICATION':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: message.title || 'KNOCK',
        message: message.message || '',
      })
      sendResponse({ success: true })
      break

    default:
      sendResponse({ success: false, error: 'Unknown message type' })
  }
})

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service worker keepalive ping')
  }
})

export {}
