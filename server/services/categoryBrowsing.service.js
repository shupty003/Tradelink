'use strict';

/**
 * services/categoryBrowsing.service.js — Category Browsing With Live Price Filtering
 *
 * Read-only composite view over the Dynamic Valuation Engine's categories
 * (services/valuation.service.js) and Skill Listing Profiles
 * (services/skillListing.service.js): a live category summary for the
 * filter UI, plus a filtered/sorted feed of active listings with their
 * provider's details attached.
 *
 * A listing never stores its own price (see SkillListing.model.js) — its
 * price here is always read live from its category's current priceBDT.
 */

const SkillCategory = require('../models/SkillCategory.model');
const SkillListing = require('../models/SkillListing.model');
const reputationService = require('./reputation.service');

const MONGO_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
};

const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Category Summary ──────────────────────────────────────────────────────────

/**
 * All seeded categories with their live price and how many active listings
 * currently exist for each — powers the category filter chips and the
 * "see live price while searching" requirement.
 */
const getCategorySummary = async () => {
  const [categories, counts] = await Promise.all([
    SkillCategory.find().sort({ name: 1 }).lean(),
    SkillListing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const listingCountBySlug = counts.reduce((acc, c) => {
    acc[c._id] = c.count;
    return acc;
  }, {});

  const summary = categories.map(cat => ({
    slug: cat.slug,
    name: cat.name,
    priceBDT: cat.priceBDT,
    demand: cat.demand,
    supply: cat.supply,
    listingCount: listingCountBySlug[cat.slug] || 0,
  }));

  // 'other' isn't a seeded category, but listings can use it — surface it
  // in the filter list only when at least one such listing exists.
  if (listingCountBySlug.other) {
    summary.push({
      slug: 'other',
      name: 'Other',
      priceBDT: null,
      demand: null,
      supply: null,
      listingCount: listingCountBySlug.other,
    });
  }

  return summary;
};

// ─── Listings Feed ──────────────────────────────────────────────────────────────

/**
 * Active (i.e. currently available) listings, filtered by category/search
 * and sorted by recency or live price, with provider details and each
 * listing's live category price attached.
 *
 * @param {{ category?: string, search?: string, sort?: 'newest'|'oldest'|'price_asc'|'price_desc' }} opts
 */
const getListings = async ({ category, search, sort = 'newest' } = {}) => {
  const query = { status: 'active' };
  if (category) {query.category = category.toLowerCase();}

  if (search && search.trim()) {
    const re = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ title: re }, { description: re }, { customCategoryName: re }];
  }

  const isPriceSort = sort === 'price_asc' || sort === 'price_desc';

  let listings = await SkillListing.find(query)
    .populate('user', 'name avatar bio company')
    .sort(MONGO_SORTS[sort] || MONGO_SORTS.newest)
    .lean();

  // Attach live prices and provider reputation scores
  const categorySlugs = [...new Set(listings.map(l => l.category).filter(slug => slug !== 'other'))];
  const userIds = [...new Set(listings.map(l => l.user?._id?.toString()).filter(Boolean))];

  const [categoryDocs, reputationResults] = await Promise.all([
    SkillCategory.find({ slug: { $in: categorySlugs } }).select('slug name priceBDT').lean(),
    Promise.all(
      userIds.map(async id => {
        try {
          const rep = await reputationService.calculateReputation(id);
          return { id, rep: { score: rep.score, tier: rep.tier, tierColor: rep.tierColor, breakdown: rep.breakdown } };
        } catch {
          return { id, rep: null };
        }
      })
    ),
  ]);

  const categoryBySlug = categoryDocs.reduce((acc, c) => {
    acc[c.slug] = c;
    return acc;
  }, {});

  const reputationByUser = reputationResults.reduce((acc, r) => {
    acc[r.id] = r.rep;
    return acc;
  }, {});

  listings = listings.map(listing => {
    const categoryDoc = categoryBySlug[listing.category];
    const userIdStr = listing.user?._id?.toString();
    return {
      ...listing,
      categoryName:
        listing.category === 'other'
          ? listing.customCategoryName || 'Other'
          : categoryDoc?.name || listing.category,
      currentPriceBDT: listing.category === 'other' ? null : categoryDoc?.priceBDT ?? null,
      reputation: reputationByUser[userIdStr] || { score: 75, tier: 'Verified Partner', tierColor: 'green' },
    };
  });

  if (isPriceSort) {
    const direction = sort === 'price_asc' ? 1 : -1;
    listings.sort((a, b) => {
      // Untracked ('other') listings have no live price — always sort last.
      if (a.currentPriceBDT === null && b.currentPriceBDT === null) {return 0;}
      if (a.currentPriceBDT === null) {return 1;}
      if (b.currentPriceBDT === null) {return -1;}
      return (a.currentPriceBDT - b.currentPriceBDT) * direction;
    });
  }

  return listings;
};

module.exports = { getCategorySummary, getListings };
