'use strict';

/**
 * controllers/want.controller.js — Multi-Party Trade Chains (the "wants" half) HTTP Layer
 */

const wantService = require('../services/want.service');

const wantController = {
  // ─── POST /api/wants ──────────────────────────────────────────────────────────
  createWant: async (req, res, next) => {
    try {
      const { category, customCategoryName, notes } = req.body;
      const want = await wantService.createWant(req.user.id, { category, customCategoryName, notes });
      return res.status(201).json({ success: true, message: 'Want added', data: want });
    } catch (err) {
      next(err);
    }
  },

  // ─── GET /api/wants/mine ──────────────────────────────────────────────────────
  getMyWants: async (req, res, next) => {
    try {
      const wants = await wantService.getMyWants(req.user.id);
      return res.status(200).json({ success: true, data: wants });
    } catch (err) {
      next(err);
    }
  },

  // ─── DELETE /api/wants/:id ────────────────────────────────────────────────────
  deleteWant: async (req, res, next) => {
    try {
      await wantService.deleteWant(req.params.id, req.user.id);
      return res.status(200).json({ success: true, message: 'Want deleted' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = wantController;
