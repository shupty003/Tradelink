'use strict';

/**
 * services/conversation.service.js — Per-Trade Direct Messaging
 *
 * createConversation()/deleteConversation() are called from the accept
 * and full-settlement points of the two trade systems (tradeProposal /
 * transaction / chainSwap services) — both are best-effort, matching the
 * pattern already used elsewhere in the app (e.g. demand adjustment,
 * notifications): a messaging hiccup should never break an accept or a
 * payment confirmation.
 */

const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const conversationService = {
  /** Opens a conversation for a newly-accepted trade. Idempotent — safe to call more than once. */
  createConversation: async ({ requesterId, providerId, relatedType, relatedId, listingTitle }) => {
    try {
      const existing = await Conversation.findOne({ relatedType, relatedId });
      if (existing) {return existing;}

      const conversation = await Conversation.create({
        requester: requesterId,
        provider: providerId,
        relatedType,
        relatedId,
        listingTitle,
      });

      logger.info(`[Conversation] Opened for ${relatedType} ${relatedId} — "${listingTitle}".`);
      return conversation;
    } catch (err) {
      logger.error(`[Conversation] Failed to open conversation for ${relatedType} ${relatedId}: ${err.message}`);
      return null;
    }
  },

  /** Closes out a conversation (and every message in it) once its trade fully settles. Best-effort. */
  deleteConversation: async ({ relatedType, relatedId }) => {
    try {
      const conversation = await Conversation.findOne({ relatedType, relatedId });
      if (!conversation) {return;}

      await Message.deleteMany({ conversation: conversation._id });
      await conversation.deleteOne();

      logger.info(`[Conversation] Closed for ${relatedType} ${relatedId} — trade fully settled.`);
    } catch (err) {
      logger.error(`[Conversation] Failed to close conversation for ${relatedType} ${relatedId}: ${err.message}`);
    }
  },

  /** Every active conversation the user is part of, newest activity first. */
  getMyConversations: async userId => {
    const conversations = await Conversation.find({ $or: [{ requester: userId }, { provider: userId }] })
      .sort({ updatedAt: -1 })
      .populate('requester', 'name avatar')
      .populate('provider', 'name avatar')
      .lean();

    return conversations.map(c => ({
      ...c,
      counterparty: c.requester._id.toString() === userId ? c.provider : c.requester,
    }));
  },

  /** The message history for one conversation — participants only. */
  getMessages: async (conversationId, userId) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {throw ApiError.notFound('Conversation not found — the trade may have already settled.');}
    if (conversation.requester.toString() !== userId && conversation.provider.toString() !== userId) {
      throw ApiError.forbidden('You are not part of this conversation');
    }

    return Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .lean();
  },

  /** Post a message into a conversation — participants only. */
  postMessage: async (conversationId, userId, text) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {throw ApiError.notFound('Conversation not found — the trade may have already settled.');}
    if (conversation.requester.toString() !== userId && conversation.provider.toString() !== userId) {
      throw ApiError.forbidden('You are not part of this conversation');
    }

    const message = await Message.create({ conversation: conversationId, sender: userId, text });

    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = text.slice(0, 120);
    await conversation.save();

    const recipientId = conversation.requester.toString() === userId
      ? conversation.provider.toString()
      : conversation.requester.toString();

    await notificationService.notify(recipientId, {
      category: 'message',
      type: 'new_message',
      title: 'New message',
      message: `New message about "${conversation.listingTitle}".`,
      link: '/dashboard/messages',
    });

    return message.populate('sender', 'name avatar');
  },
};

module.exports = conversationService;
