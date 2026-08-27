'use strict';

/**
 * models/Notification.model.js — In-App Notification Center
 *
 * A persistent, per-user event log — every notable action elsewhere in
 * the app (a trade request received/accepted/declined, a transaction
 * step advancing, a dispute message or resolution) writes one row here
 * via notification.service.js's notify(). Read/unread state is tracked
 * explicitly (isRead), not derived, so a notification stays "seen" once
 * the user visits the relevant page — see notification.service.js's
 * markCategoryRead.
 *
 * `category` groups notifications for the sidebar badge counts (one
 * badge per category, not per type) — 'request' → Requests link,
 * 'transaction' → Transactions link, 'profile' → My Profile link,
 * 'message' → Messages link.
 */

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['request', 'transaction', 'profile', 'message'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'trade_request_received',
        'trade_request_accepted',
        'trade_request_declined',
        'transaction_delivered',
        'transaction_received',
        'transaction_paid',
        'transaction_payment_submitted',
        'transaction_payment_rejected',
        'dispute_raised',
        'dispute_message',
        'trade_chain_opportunity',
        'dispute_resolved',
        'dispute_account_suspended',
        'chain_swap_requested',
        'chain_swap_accepted',
        'chain_swap_declined',
        'chain_swap_completed',
        'new_message',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' }, // relative client route to navigate to
    relatedTradeProposal: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeProposal', default: null },
    relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, category: 1, isRead: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
