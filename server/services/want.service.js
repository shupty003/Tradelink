'use strict';

/**
 * services/want.service.js — Multi-Party Trade Chains (the "wants" half)
 *
 * CRUD only. Unlike SkillListing, a Want never adjusts Dynamic Valuation
 * Engine supply/demand — it's purely a signal for tradeChain.service.js's
 * matcher, not a pricing input.
 */

const Want = require('../models/Want.model');
const SkillCategory = require('../models/SkillCategory.model');
const ApiError = require('../utils/ApiError');

/** A category is valid if it's the literal 'other' or the slug of an existing SkillCategory. */
const assertKnownCategory = async category => {
  if (category === 'other') {return;}
  const exists = await SkillCategory.exists({ slug: category });
  if (!exists) {
    throw ApiError.badRequest(`'${category}' is not a known skill category — choose a listed category or 'other'`);
  }
};

const wantService = {
  createWant: async (userId, { category, customCategoryName, notes }) => {
    await assertKnownCategory(category);

    const want = await Want.create({
      user: userId,
      category,
      customCategoryName: category === 'other' ? customCategoryName : null,
      notes: notes || '',
    });

    return want.toObject();
  },

  /** All wants owned by a user (any status) — for "manage what I'm looking for". */
  getMyWants: async userId => Want.find({ user: userId }).sort({ createdAt: -1 }).lean(),

  /** Delete a want (owner only). */
  deleteWant: async (id, userId) => {
    const want = await Want.findById(id);
    if (!want) {throw ApiError.notFound('Want not found');}
    if (want.user.toString() !== userId) {
      throw ApiError.forbidden('You can only delete your own wants');
    }
    await want.deleteOne();
  },
};

module.exports = wantService;
