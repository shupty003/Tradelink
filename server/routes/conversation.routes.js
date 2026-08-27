'use strict';

/**
 * routes/conversation.routes.js — Per-Trade Direct Messaging Routes
 *
 * GET  /api/conversations/mine            → every active conversation you're part of
 * GET  /api/conversations/:id/messages    → message history for one conversation
 * POST /api/conversations/:id/messages    → send a message into one conversation
 */

const express = require('express');
const conversationController = require('../controllers/conversation.controller');
const { protect } = require('../middleware/auth');
const { validateConversationId, validatePostMessage } = require('../validations/conversation.validation');

const router = express.Router();

router.get('/mine', protect, conversationController.getMine);
router.get('/:id/messages', protect, validateConversationId, conversationController.getMessages);
router.post('/:id/messages', protect, validatePostMessage, conversationController.postMessage);

module.exports = router;
