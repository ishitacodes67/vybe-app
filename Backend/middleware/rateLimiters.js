const rateLimit = require("express-rate-limit");

// Generic limiter for all API requests (applied at app level in server.js)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." }
});

// Strict limiter for login attempts (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 login attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // successful logins don't count against the limit
  message: {
    message: "Too many login attempts. Please wait 15 minutes and try again."
  }
});

// Register limiter — prevents mass account creation from one IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 new accounts per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many accounts created from this IP. Try again in an hour."
  }
});

// Password reset request limiter — prevents email spam
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,                    // 3 forgot-password requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many password reset requests. Try again later."
  }
});

// Chat / Vix limiter — protects the AI service from abuse
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "You're chatting too fast. Please slow down."
  }
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  chatLimiter
};