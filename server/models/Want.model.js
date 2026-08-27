'use strict';

/**
 * models/Want.model.js — Multi-Party Trade Chains (the "wants" half)
 *
 * A SkillListing is what a user offers; a Want is the other half — what
 * they're looking for in return. Neither carries a price: chain-matching
 * (services/tradeChain.service.js) is a pure discovery layer over who
 * offers what and who wants what. It never touches the Dynamic Valuation
 * Engine or its pricing — each trade that eventually results from a
 * discovered chain still goes through the normal, unmodified
 * TradeProposal flow at the live market rate.
 */

const mongoose = require('mongoose');

const WantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Same category shape as SkillListing — either a seeded SkillCategory
    // slug or the literal 'other' (with customCategoryName required).
    category: {
      type: String,
      required: [true, 'Category is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    customCategoryName: {
      type: String,
      trim: true,
      maxlength: [100, 'Custom category name must be under 100 characters'],
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must be under 500 characters'],
      default: '',
    },

    status: {
      type: String,
      enum: ['open', 'cancelled'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

WantSchema.index({ category: 1, status: 1 });

WantSchema.pre('validate', function (next) {
  if (this.category === 'other' && !this.customCategoryName) {
    this.invalidate('customCategoryName', 'Custom category name is required when category is "other"');
  }
  if (this.category !== 'other') {
    this.customCategoryName = null;
  }
  next();
});

const Want = mongoose.model('Want', WantSchema);

module.exports = Want;
