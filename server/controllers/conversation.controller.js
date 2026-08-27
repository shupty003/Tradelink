'use strict';

/**
 * controllers/conversation.controller.js — Per-Trade Direct Messaging HTTP Layer
 */

const conversationService = require('../services/conversation.service');

const conversationController = {
  // ─── GET /api/conversations/mine ─────────────────────────────────────────────
  getMine: async (req, res, next) => {
    try {
      const conversations = await conversationService.getMyConversations(req.user.id);
      return res.status(200).json({ success: true, data: conversations });
    } catch (err) {
      next(err);
    }
  },

  // ─── GET /api/conversations/:id/messages ─────────────────────────────────────
  getMessages: async (req, res, next) => {
    try {
      const messages = await conversationService.getMessages(req.params.id, req.user.id);
      return res.status(200).json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  },

  // ─── POST /api/conversations/:id/messages ────────────────────────────────────
  postMessage: async (req, res, next) => {
    try {
      const message = await conversationService.postMessage(req.params.id, req.user.id, req.body.text);
      return res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = conversationController;
