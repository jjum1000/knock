// Chrome Storage Helper for KNOCK Extension
console.log('📦 KNOCK Storage Helper loaded');

const StorageHelper = {
  // Save message to conversation
  async saveMessage(roommateId, message) {
    try {
      const key = `conversation_${roommateId}`;
      const result = await chrome.storage.local.get([key]);
      const messages = result[key] || [];

      messages.push({
        ...message,
        timestamp: message.timestamp || Date.now()
      });

      await chrome.storage.local.set({ [key]: messages });
      console.log(`[Storage] Saved message for ${roommateId}:`, message);
      return true;
    } catch (error) {
      console.error('[Storage] Failed to save message:', error);
      return false;
    }
  },

  // Load all messages for a roommate
  async loadMessages(roommateId) {
    try {
      const key = `conversation_${roommateId}`;
      const result = await chrome.storage.local.get([key]);
      const messages = result[key] || [];
      console.log(`[Storage] Loaded ${messages.length} messages for ${roommateId}`);
      return messages;
    } catch (error) {
      console.error('[Storage] Failed to load messages:', error);
      return [];
    }
  },

  // Clear conversation for a roommate
  async clearConversation(roommateId) {
    try {
      const key = `conversation_${roommateId}`;
      await chrome.storage.local.remove([key]);
      console.log(`[Storage] Cleared conversation for ${roommateId}`);
      return true;
    } catch (error) {
      console.error('[Storage] Failed to clear conversation:', error);
      return false;
    }
  },

  // Save user settings
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ user_settings: settings });
      console.log('[Storage] Saved settings:', settings);
      return true;
    } catch (error) {
      console.error('[Storage] Failed to save settings:', error);
      return false;
    }
  },

  // Load user settings
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['user_settings']);
      return result.user_settings || {
        notifications: true,
        currentRoommate: 'Alex',
        knocksRemaining: 1
      };
    } catch (error) {
      console.error('[Storage] Failed to load settings:', error);
      return {
        notifications: true,
        currentRoommate: 'Alex',
        knocksRemaining: 1
      };
    }
  },

  // Get all roommate conversations
  async getAllConversations() {
    try {
      const result = await chrome.storage.local.get(null);
      const conversations = {};

      Object.keys(result).forEach(key => {
        if (key.startsWith('conversation_')) {
          const roommateId = key.replace('conversation_', '');
          conversations[roommateId] = result[key];
        }
      });

      console.log('[Storage] Loaded all conversations:', Object.keys(conversations));
      return conversations;
    } catch (error) {
      console.error('[Storage] Failed to load all conversations:', error);
      return {};
    }
  },

  // Clear all data (for debugging)
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      console.log('[Storage] Cleared all data');
      return true;
    } catch (error) {
      console.error('[Storage] Failed to clear all data:', error);
      return false;
    }
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.StorageHelper = StorageHelper;
}
