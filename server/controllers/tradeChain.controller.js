'use strict';

/**
 * controllers/tradeChain.controller.js — Multi-Party Trade Chains HTTP Layer
 */

const tradeChainService = require('../services/tradeChain.service');

const tradeChainController = {
  // ─── GET /api/trade-chains/search?wantId= ────────────────────────────────────
  search: async (req, res, next) => {
    try {
      const chains = await tradeChainService.findChains(req.user.id, req.query.wantId);
      return res.status(200).json({ success: true, count: chains.length, data: chains });
    } catch (err) {
      next(err);
    }
  },

  // ─── POST /api/trade-chains/notify ───────────────────────────────────────────
  notify: async (req, res, next) => {
    try {
      const { wantId, participants, closingListingId } = req.body;
      const result = await tradeChainService.notifyChainParticipants(req.user.id, {
        wantId,
        participants,
        closingListingId,
      });
      return res.status(200).json({
        success: true,
        message: `Notified ${result.notified} other participant${result.notified !== 1 ? 's' : ''} about this chain.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = tradeChainController;
