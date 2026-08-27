'use strict';

/**
 * controllers/chainSwap.controller.js — Multi-Party Trade Chains (barter settlement) HTTP Layer
 */

const chainSwapService = require('../services/chainSwap.service');

const chainSwapController = {
  // ─── POST /api/chain-swaps ────────────────────────────────────────────────────
  proposeSwap: async (req, res, next) => {
    try {
      const { listingId, scheduledAt, message } = req.body;
      const swap = await chainSwapService.proposeSwap(req.user.id, { listingId, scheduledAt, message });
      return res.status(201).json({
        success: true,
        message: 'Swap proposed — no payment involved, waiting for the provider to accept.',
        data: swap,
      });
    } catch (err) {
      next(err);
    }
  },

  // ─── GET /api/chain-swaps/sent ────────────────────────────────────────────────
  getSent: async (req, res, next) => {
    try {
      const swaps = await chainSwapService.getSentSwaps(req.user.id);
      return res.status(200).json({ success: true, data: swaps });
    } catch (err) {
      next(err);
    }
  },

  // ─── GET /api/chain-swaps/received ────────────────────────────────────────────
  getReceived: async (req, res, next) => {
    try {
      const swaps = await chainSwapService.getReceivedSwaps(req.user.id);
      return res.status(200).json({ success: true, data: swaps });
    } catch (err) {
      next(err);
    }
  },

  // ─── PATCH /api/chain-swaps/:id/accept ────────────────────────────────────────
  accept: async (req, res, next) => {
    try {
      const swap = await chainSwapService.acceptSwap(req.params.id, req.user.id);
      return res.status(200).json({ success: true, message: 'Swap accepted.', data: swap });
    } catch (err) {
      next(err);
    }
  },

  // ─── PATCH /api/chain-swaps/:id/decline ───────────────────────────────────────
  decline: async (req, res, next) => {
    try {
      const swap = await chainSwapService.declineSwap(req.params.id, req.user.id);
      return res.status(200).json({ success: true, message: 'Swap declined.', data: swap });
    } catch (err) {
      next(err);
    }
  },

  // ─── DELETE /api/chain-swaps/:id ──────────────────────────────────────────────
  cancel: async (req, res, next) => {
    try {
      const swap = await chainSwapService.cancelSwap(req.params.id, req.user.id);
      return res.status(200).json({ success: true, message: 'Swap cancelled.', data: swap });
    } catch (err) {
      next(err);
    }
  },

  // ─── PATCH /api/chain-swaps/:id/confirm ───────────────────────────────────────
  confirm: async (req, res, next) => {
    try {
      const swap = await chainSwapService.confirmSwap(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        message: swap.status === 'completed' ? 'Swap confirmed — both sides are done!' : 'Confirmed. Waiting for the other side to confirm too.',
        data: swap,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = chainSwapController;
