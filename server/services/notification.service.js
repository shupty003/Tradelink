'use strict';

/**
 * services/notification.service.js — In-App Notification Center
 *
 * notify() is called from other services the instant something
 * notification-worthy happens (a trade request, a transaction step, a
 * dispute message/resolution). It's best-effort by design — matching the
 * pattern already used for demand adjustment elsewhere in the app — a
 * notification failing to write should never break the real action that
 * triggered it.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification.model');
const logger = require('../utils/logger');

const notificationService = {
  /**
   * Fire-and-forget notification creation. Never throws.
   * @param {string} userId
   * @param {{ category: 'request'|'transaction'|'profile'|'message', type: string, title: string, message: string, link?: string, relatedTradeProposal?: string, relatedTransaction?: string }} data
   */
  notify: async (userId, data) => {
    try {
      await Notification.create({ user: userId, ...data });
    } catch (err) {
      logger.error(`[Notification] Failed to create notification for ${userId}: ${err.message}`);
    }
  },

  /** Most recent notifications for the logged-in user. */
  getMyNotifications: async (userId, { category, limit = 30 } = {}) => {
    const query = { user: userId };
    if (category) {query.category = category;}
    return Notification.find(query).sort({ createdAt: -1 }).limit(Number(limit)).lean();
  },

  /** Unread counts per category, for the sidebar badges. */
  getUnreadCounts: async userId => {
    const rows = await Notification.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), isRead: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const counts = { request: 0, transaction: 0, profile: 0, message: 0 };
    rows.forEach(r => { counts[r._id] = r.count; });
    counts.total = counts.request + counts.transaction + counts.profile + counts.message;
    return counts;
  },

  /** Mark a single notification read (only the owner can). */
  markRead: async (userId, notificationId) => {
    await Notification.updateOne({ _id: notificationId, user: userId }, { $set: { isRead: true } });
  },

  /** Mark every unread notification in a category (or all) read for this user — called when they visit the relevant page. */
  markCategoryRead: async (userId, category) => {
    const query = { user: userId, isRead: false };
    if (category) {query.category = category;}
    await Notification.updateMany(query, { $set: { isRead: true } });
  },
};

module.exports = notificationService;
