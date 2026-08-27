'use strict';

/**
 * services/chainSwap.service.js — Multi-Party Trade Chains (true barter settlement)
 *
 * Business logic for proposing, accepting/declining/cancelling, and
 * confirming a single chain leg. No money, no valuation-engine price, no
 * escrow — this is a direct skill-for-skill exchange, entirely separate
 * from tradeProposal.service.js / transaction.service.js.
 */

const ChainSwap = require('../models/ChainSwap.model');
const SkillListing = require('../models/SkillListing.model');
const notificationService = require('./notification.service');
const conversationService = require('./conversation.service');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const chainSwapService = {
  /**
   * A chain participant proposes to receive a listed skill — no payment,
   * this is one leg of a trade chain (services/tradeChain.service.js).
   */
  proposeSwap: async (requesterId, { listingId, scheduledAt, message }) => {
    const listing = await SkillListing.findById(listingId);
    if (!listing) {throw ApiError.notFound('Skill listing not found');}
    if (listing.status !== 'active') {
      throw ApiError.badRequest('This listing is not currently active');
    }
    if (listing.user.toString() === requesterId) {
      throw ApiError.badRequest('You cannot propose a swap on your own listing');
    }

    const sessionDate = new Date(scheduledAt);
    if (Number.isNaN(sessionDate.getTime()) || sessionDate <= new Date()) {
      throw ApiError.badRequest('Proposed session time must be a valid date in the future');
    }

    const swap = await ChainSwap.create({
      requester: requesterId,
      provider: listing.user,
      listing: listing._id,
      listingTitle: listing.title,
      category: listing.category,
      customCategoryName: listing.customCategoryName,
      scheduledAt: sessionDate,
      message: message || '',
    });

    logger.info(`[ChainSwap] ${swap._id} proposed by ${requesterId} for listing "${listing.title}".`);

    await notificationService.notify(listing.user, {
      category: 'request',
      type: 'chain_swap_requested',
      title: 'New trade chain swap request',
      message: `Someone wants to swap for your "${listing.title}" listing — no payment, it's part of a trade chain.`,
      link: '/dashboard/trade-chains',
    });

    return swap;
  },

  /** Swaps the user sent, as requester. */
  getSentSwaps: async userId =>
    ChainSwap.find({ requester: userId })
      .sort({ createdAt: -1 })
      .populate('provider', 'name email avatar')
      .lean(),

  /** Swaps the user received, as provider. */
  getReceivedSwaps: async userId =>
    ChainSwap.find({ provider: userId })
      .sort({ createdAt: -1 })
      .populate('requester', 'name email avatar')
      .lean(),

  acceptSwap: async (id, providerId) => {
    const swap = await ChainSwap.findById(id);
    if (!swap) {throw ApiError.notFound('Chain swap not found');}
    if (swap.provider.toString() !== providerId) {
      throw ApiError.forbidden('Only the provider can accept this swap');
    }
    if (swap.status !== 'pending') {
      throw ApiError.badRequest(`This swap is already ${swap.status}`);
    }

    swap.status = 'accepted';
    await swap.save();

    await conversationService.createConversation({
      requesterId: swap.requester,
      providerId: swap.provider,
      relatedType: 'ChainSwap',
      relatedId: swap._id,
      listingTitle: swap.listingTitle,
    });

    await notificationService.notify(swap.requester, {
      category: 'request',
      type: 'chain_swap_accepted',
      title: 'Trade chain swap accepted',
      message: `Your swap request for "${swap.listingTitle}" was accepted.`,
      link: '/dashboard/trade-chains',
    });

    return swap;
  },

  declineSwap: async (id, providerId) => {
    const swap = await ChainSwap.findById(id);
    if (!swap) {throw ApiError.notFound('Chain swap not found');}
    if (swap.provider.toString() !== providerId) {
      throw ApiError.forbidden('Only the provider can decline this swap');
    }
    if (swap.status !== 'pending') {
      throw ApiError.badRequest(`This swap is already ${swap.status}`);
    }

    swap.status = 'declined';
    await swap.save();

    await notificationService.notify(swap.requester, {
      category: 'request',
      type: 'chain_swap_declined',
      title: 'Trade chain swap declined',
      message: `Your swap request for "${swap.listingTitle}" was declined.`,
      link: '/dashboard/trade-chains',
    });

    return swap;
  },

  cancelSwap: async (id, requesterId) => {
    const swap = await ChainSwap.findById(id);
    if (!swap) {throw ApiError.notFound('Chain swap not found');}
    if (swap.requester.toString() !== requesterId) {
      throw ApiError.forbidden('Only the requester can cancel this swap');
    }
    if (swap.status !== 'pending') {
      throw ApiError.badRequest(`This swap is already ${swap.status}`);
    }

    swap.status = 'cancelled';
    await swap.save();
    return swap;
  },

  /**
   * Either party confirms the skill exchange happened. Once both have
   * confirmed, the swap is complete — no payment or escrow release
   * involved, this just closes out the leg.
   */
  confirmSwap: async (id, userId) => {
    const swap = await ChainSwap.findById(id);
    if (!swap) {throw ApiError.notFound('Chain swap not found');}

    const isRequester = swap.requester.toString() === userId;
    const isProvider = swap.provider.toString() === userId;
    if (!isRequester && !isProvider) {
      throw ApiError.forbidden('You are not part of this swap');
    }
    if (swap.status !== 'accepted' && swap.status !== 'completed') {
      throw ApiError.badRequest(`This swap isn't ready to confirm yet (status: ${swap.status})`);
    }

    if (isRequester) {
      if (swap.requesterConfirmed) {throw ApiError.badRequest("You've already confirmed this swap");}
      swap.requesterConfirmed = true;
      swap.requesterConfirmedAt = new Date();
    } else {
      if (swap.providerConfirmed) {throw ApiError.badRequest("You've already confirmed this swap");}
      swap.providerConfirmed = true;
      swap.providerConfirmedAt = new Date();
    }

    const bothConfirmed = swap.requesterConfirmed && swap.providerConfirmed;
    if (bothConfirmed) {
      swap.status = 'completed';
    }
    await swap.save();

    if (bothConfirmed) {
      logger.info(`[ChainSwap] ${swap._id} completed — both sides confirmed.`);
      await conversationService.deleteConversation({ relatedType: 'ChainSwap', relatedId: swap._id });
      await Promise.all(
        [swap.requester.toString(), swap.provider.toString()].map(uid =>
          notificationService.notify(uid, {
            category: 'request',
            type: 'chain_swap_completed',
            title: 'Trade chain swap completed',
            message: `Your swap for "${swap.listingTitle}" is complete — both sides confirmed.`,
            link: '/dashboard/trade-chains',
          })
        )
      );
    }

    return swap;
  },
};

module.exports = chainSwapService;
