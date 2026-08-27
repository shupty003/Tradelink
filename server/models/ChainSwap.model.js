'use strict';

/**
 * models/ChainSwap.model.js — Multi-Party Trade Chains (true barter settlement)
 *
 * A single leg of a discovered trade chain (services/tradeChain.service.js),
 * proposed once the searching user acts on a chain result. Deliberately
 * separate from TradeProposal/Transaction — chain legs are a direct,
 * no-money skill-for-skill exchange, never priced by the Dynamic
 * Valuation Engine and never opening a cash escrow hold. The requester
 * receives the provider's listed skill; nothing is paid for it, because
 * fairness comes from the loop closing (everyone gives once and receives
 * once across the chain), not from any single leg being reciprocal.
 *
 * Lifecycle: pending → accepted (provider) → completed (once BOTH sides
 * independently confirm the session happened), or declined/cancelled
 * before acceptance.
 */

const mongoose = require('mongoose');

const ChainSwapSchema = new mongoose.Schema(
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
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillListing',
      required: true,
    },

    // Denormalized so the swap stays meaningful even if the listing changes later.
    listingTitle: { type: String, required: true },
    category: { type: String, required: true },
    customCategoryName: { type: String, default: null },

    scheduledAt: {
      type: Date,
      required: [true, 'A proposed session time is required'],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message must be under 500 characters'],
      default: '',
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },

    // Step 1 & 2 (only reachable once accepted) — mirrors the escrow
    // Transaction's mutual-confirm pattern, minus any money.
    requesterConfirmed: { type: Boolean, default: false },
    requesterConfirmedAt: Date,
    providerConfirmed: { type: Boolean, default: false },
    providerConfirmedAt: Date,
  },
  { timestamps: true }
);

ChainSwapSchema.index({ requester: 1, status: 1 });
ChainSwapSchema.index({ provider: 1, status: 1 });

const ChainSwap = mongoose.model('ChainSwap', ChainSwapSchema);

module.exports = ChainSwap;
