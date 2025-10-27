// Firebase Configuration for Chrome Extension
// Copy this file to firebase-config.js and fill in your credentials

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// OpenAI API Configuration
const openaiConfig = {
  apiKey: "YOUR_OPENAI_API_KEY",
  model: "gpt-4o-mini"
};

// Export for use in other scripts
window.FIREBASE_CONFIG = firebaseConfig;
window.OPENAI_CONFIG = openaiConfig;
