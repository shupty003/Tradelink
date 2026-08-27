'use strict';

/**
 * models/Message.model.js — Per-Trade Direct Messaging
 *
 * One chat message within a Conversation. Deleted en masse whenever its
 * parent Conversation is deleted (see conversation.service.js's
 * deleteConversation) — messages never outlive the trade they belong to.
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
