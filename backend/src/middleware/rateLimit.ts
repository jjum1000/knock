import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'), // 1 hour
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later',
  },
});

/**
 * Chat message rate limiter
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60, // 60 messages per hour
  message: {
    success: false,
    error: 'CHAT_RATE_LIMIT_EXCEEDED',
    message: 'Chat rate limit exceeded, please wait before sending more messages',
  },
  skipSuccessfulRequests: false,
});

/**
 * Onboarding completion limiter (once per day)
 */
export const onboardingLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1,
  message: {
    success: false,
    error: 'ONBOARDING_RATE_LIMIT',
    message: 'You can only complete onboarding once per day',
  },
  skipSuccessfulRequests: true, // Don't count failed attempts
});

/**
 * Admin action limiter
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // More lenient for admins
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Admin rate limit exceeded',
  },
});
