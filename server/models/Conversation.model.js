'use strict';

/**
 * models/Conversation.model.js — Per-Trade Direct Messaging
 *
 * One conversation is opened automatically the instant a trade is
 * accepted — either a cash TradeProposal (see tradeProposal.service.js's
 * acceptProposal) or a barter ChainSwap (see chainSwap.service.js's
 * acceptSwap) — so the requester and provider can coordinate the session.
 *
 * It's deleted automatically (along with every Message in it) the instant
 * the trade fully settles: a cash trade's Transaction reaching 'paid'
 * (see transaction.service.js's confirmOfflinePayment/verifyBkashPayment),
 * or a ChainSwap reaching 'completed' (both sides confirmed). There's
 * nothing left to coordinate once the trade is done.
 *
 * A user can be in many conversations at once — one per active trade,
 * with either the same or different counterparties — never one merged
 * inbox thread per person.
 */

const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Which trade this conversation belongs to — a cash TradeProposal or a
    // no-money ChainSwap. Dynamic ref via relatedType so either can be
    // populated directly.
    relatedType: {
      type: String,
      enum: ['TradeProposal', 'ChainSwap'],
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'relatedType',
    },

    listingTitle: { type: String, required: true },

    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, default: '' },
  },
  { timestamps: true }
);

// One conversation per trade — createConversation() is idempotent against this.
ConversationSchema.index({ relatedType: 1, relatedId: 1 }, { unique: true });
ConversationSchema.index({ requester: 1, updatedAt: -1 });
ConversationSchema.index({ provider: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
