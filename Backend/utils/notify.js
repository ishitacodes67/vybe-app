const Notification = require("../models/Notification");

const ALLOWED_TYPES = ["info", "success", "warning", "error"];

/**
 * Create a notification for a user.
 *
 * Accepts either:
 *   createNotification(userId, { title, message, type, link, eventName })
 *   createNotification(userId, title, message, type, link)
 */
async function createNotification(userId, titleOrOptions, message, type, link) {
  let title;
  let eventName = "notification:new";

  if (typeof titleOrOptions === "object" && titleOrOptions !== null) {
    ({ title, message, type, link, eventName = eventName } = titleOrOptions);
  } else {
    title = titleOrOptions;
  }

  // Guard: never write a type the schema will reject.
  if (!ALLOWED_TYPES.includes(type)) {
    type = "info";
  }

  return Notification.create({
    user: userId,
    title,
    message,
    type,
    link,
    channel: `user:${userId}`,
    eventName
  });
}

module.exports = { createNotification };