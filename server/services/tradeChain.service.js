'use strict';

/**
 * services/tradeChain.service.js — Multi-Party Trade Chains with Location Matching
 *
 * Pure discovery layer — this file never creates or modifies a
 * TradeProposal, Transaction, ChainSwap, or any valuation-engine data. It
 * only reads active SkillListings and open Wants to find a loop of
 * participants whose offers and wants close a cycle, and (once the
 * searching user acts on a result) sends informational notifications.
 *
 * A found chain is never persisted — it's recomputed on demand. Acting on
 * one works like this (see controllers/tradeChain.controller.js and the
 * client's Trade Chains page):
 *   1. The searching user proposes their OWN leg of the chain through
 *      POST /api/chain-swaps (see chainSwap.service.js) — a true, direct
 *      skill-for-skill swap with no money involved and no valuation-engine
 *      price, entirely separate from the cash TradeProposal/Transaction
 *      system.
 *   2. notifyChainParticipants() then tells every OTHER participant what
 *      they could receive next if they choose to propose their own leg —
 *      nobody's identity is ever used to create a swap on their behalf.
 * There is deliberately no atomicity across a chain's links: each link is
 * an ordinary, independent swap that can be individually accepted or
 * declined — fairness comes from the loop closing, not from any single
 * link being reciprocal.
 */

const Want = require('../models/Want.model');
const SkillListing = require('../models/SkillListing.model');
const User = require('../models/User.model');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');

// A cycle this long would rarely be practical to actually coordinate — kept
// small on purpose, matching the "basic matching algorithm" the feature
// calls for (a bounded depth-first search, not general graph optimization).
const MAX_CHAIN_LINKS = 5;
const MAX_RESULTS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalizes a category (or custom "other" name) into one comparable key. */
const categoryKey = ({ category, customCategoryName }) =>
  category === 'other' ? `other:${(customCategoryName || '').trim().toLowerCase()}` : category;

const hasValidCoords = loc => loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';

/** Centroid of every participant's (and the searching user's) location — only if ALL have one set. */
const computeMeetingPoint = (myLocation, participantUsers) => {
  const locations = [myLocation, ...participantUsers.map(u => u.location)];
  if (locations.length === 0 || !locations.every(hasValidCoords)) {return null;}

  const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
  return { lat: avgLat, lng: avgLng };
};

const summarizeListing = listing =>
  listing && {
    id: listing._id,
    title: listing.title,
    category: listing.category,
    customCategoryName: listing.customCategoryName,
  };

const summarizeUser = user =>
  user && {
    id: user._id,
    name: user.name,
    avatar: user.avatar,
    location: hasValidCoords(user.location) ? user.location : null,
  };

// ─── Service ──────────────────────────────────────────────────────────────────

const tradeChainService = {
  /**
   * Depth-first search for chains that close a loop back to the searching
   * user, starting from one of their own open Wants.
   */
  findChains: async (userId, wantId) => {
    const startWant = await Want.findById(wantId).lean();
    if (!startWant) {throw ApiError.notFound('Want not found');}
    if (startWant.user.toString() !== userId) {
      throw ApiError.forbidden('You can only search chains for your own want');
    }
    if (startWant.status !== 'open') {
      throw ApiError.badRequest('This want is no longer open');
    }

    const [me, myListings, allListings, allWants] = await Promise.all([
      User.findById(userId).select('location').lean(),
      SkillListing.find({ user: userId, status: 'active' }).lean(),
      SkillListing.find({ status: 'active' }).populate('user', 'name avatar location').lean(),
      Want.find({ status: 'open' }).lean(),
    ]);

    const myOfferedKeys = new Set(myListings.map(categoryKey));
    if (myOfferedKeys.size === 0) {
      return []; // nothing of mine could ever close a loop
    }

    // category key → listings offering it (excluding the searching user's own)
    const offersByCategory = new Map();
    allListings.forEach(listing => {
      if (listing.user._id.toString() === userId) {return;}
      const key = categoryKey(listing);
      if (!offersByCategory.has(key)) {offersByCategory.set(key, []);}
      offersByCategory.get(key).push(listing);
    });

    // user id → their open wants (excluding the searching user's own other wants)
    const wantsByUser = new Map();
    allWants.forEach(w => {
      const uid = w.user.toString();
      if (uid === userId) {return;}
      if (!wantsByUser.has(uid)) {wantsByUser.set(uid, []);}
      wantsByUser.get(uid).push(w);
    });

    const results = [];

    const dfs = (neededKey, chain, visitedUserIds) => {
      if (results.length >= MAX_RESULTS) {return;}

      const candidates = offersByCategory.get(neededKey) || [];
      for (const listing of candidates) {
        const candidateUserId = listing.user._id.toString();
        if (visitedUserIds.has(candidateUserId)) {continue;}

        const newChain = [...chain, { user: listing.user, listing }];
        const candidateWants = wantsByUser.get(candidateUserId) || [];

        // Does this candidate want something I offer? The loop closes here.
        const closingWant = candidateWants.find(w => myOfferedKeys.has(categoryKey(w)));
        if (closingWant) {
          const closingListing = myListings.find(l => categoryKey(l) === categoryKey(closingWant));
          results.push({ participants: newChain, closingListing, chainLength: newChain.length + 1 });
          if (results.length >= MAX_RESULTS) {return;}
        }

        // Keep extending the chain through the candidate's other wants.
        if (newChain.length < MAX_CHAIN_LINKS) {
          const nextVisited = new Set(visitedUserIds);
          nextVisited.add(candidateUserId);
          for (const w of candidateWants) {
            if (closingWant && w._id.toString() === closingWant._id.toString()) {continue;}
            dfs(categoryKey(w), newChain, nextVisited);
          }
        }
      }
    };

    dfs(categoryKey(startWant), [], new Set([userId]));

    results.sort((a, b) => a.chainLength - b.chainLength);

    return results.slice(0, MAX_RESULTS).map(({ participants, closingListing, chainLength }) => ({
      chainLength,
      participants: participants.map(p => ({ user: summarizeUser(p.user), listing: summarizeListing(p.listing) })),
      closingListing: summarizeListing(closingListing),
      meetingPoint: computeMeetingPoint(me?.location, participants.map(p => p.user)),
    }));
  },

  /**
   * Called once the searching user has proposed their own leg (via the
   * ordinary trade-proposals endpoint) — tells every OTHER participant in
   * the chain what they could get next if they propose their own leg.
   * Re-validates every listing server-side; never trusts the client's
   * chain payload blindly.
   */
  notifyChainParticipants: async (userId, { wantId, participants, closingListingId }) => {
    const want = await Want.findById(wantId).lean();
    if (!want || want.user.toString() !== userId) {
      throw ApiError.forbidden('You can only act on a chain for your own want');
    }

    const [me, closingListing] = await Promise.all([
      User.findById(userId).select('name').lean(),
      SkillListing.findById(closingListingId).lean(),
    ]);
    if (!closingListing || closingListing.user.toString() !== userId || closingListing.status !== 'active') {
      throw ApiError.badRequest('Your closing listing for this chain is no longer valid');
    }

    const validated = [];
    for (const p of participants) {
      const listing = await SkillListing.findById(p.listingId).lean();
      if (!listing || listing.status !== 'active' || listing.user.toString() !== p.userId) {
        throw ApiError.badRequest('This chain is no longer valid — one of the listings has changed. Please search again.');
      }
      validated.push({ userId: p.userId, listing });
    }

    await Promise.all(
      validated.map((current, i) => {
        const next = validated[i + 1] || { listing: closingListing };
        return notificationService.notify(current.userId, {
          category: 'request',
          type: 'trade_chain_opportunity',
          title: 'A trade chain opportunity was found',
          message: `${me.name} proposed a no-payment swap for your "${current.listing.title}" listing as part of a discovered trade chain — you could get "${next.listing.title}" in return by proposing a swap for it.`,
          link: '/dashboard/trade-chains',
        });
      })
    );

    return { notified: validated.length };
  },
};

module.exports = tradeChainService;
