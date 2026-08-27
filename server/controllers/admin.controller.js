'use strict';

/**
 * controllers/admin.controller.js — Admin Controller Handlers
 */

const adminService = require('../services/admin.service');
const tradeProposalService = require('../services/tradeProposal.service');
const { recalculateCategoryPrices } = require('../services/valuation.service');

const adminController = {
  getPlatformStats: async (req, res, next) => {
    try {
      const stats = await adminService.getPlatformStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  getUsers: async (req, res, next) => {
    try {
      const result = await adminService.getUsers(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  toggleUserSuspend: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { isSuspended } = req.body;
      const user = await adminService.toggleUserSuspend(req.user.id, userId, Boolean(isSuspended));
      res.json({
        success: true,
        message: `User status updated to ${isSuspended ? 'Suspended' : 'Active'}`,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  toggleUserVerification: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { isVerified } = req.body;
      const user = await adminService.toggleUserVerification(userId, Boolean(isVerified));
      res.json({
        success: true,
        message: `User verification updated to ${isVerified ? 'Verified' : 'Unverified'}`,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  getCategories: async (req, res, next) => {
    try {
      const categories = await adminService.getCategories();
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  },

  createCategory: async (req, res, next) => {
    try {
      const category = await adminService.createCategory(req.body);
      res.status(201).json({
        success: true,
        message: `Skill category "${category.name}" created successfully.`,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  },

  updateCategory: async (req, res, next) => {
    try {
      const { categoryId } = req.params;
      const category = await adminService.updateCategory(categoryId, req.body);
      res.json({
        success: true,
        message: `Category "${category.name}" updated successfully.`,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  },

  getTradeProposals: async (req, res, next) => {
    try {
      const result = await adminService.getTradeProposals(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  getDisputeDetail: async (req, res, next) => {
    try {
      const { proposalId } = req.params;
      const result = await adminService.getDisputeDetail(proposalId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  resolveDispute: async (req, res, next) => {
    try {
      const { proposalId } = req.params;
      const result = await adminService.resolveDispute(proposalId, req.body);
      res.json({
        success: true,
        message: 'Dispute resolved successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  suspendDisputeParties: async (req, res, next) => {
    try {
      const { proposalId } = req.params;
      const result = await adminService.suspendDisputeParties(req.user.id, proposalId);
      res.json({
        success: true,
        message: 'Both accounts have been suspended.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  getDisputeMessages: async (req, res, next) => {
    try {
      const messages = await tradeProposalService.getMessages(req.params.proposalId, req.user.id, true);
      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  },

  postDisputeMessage: async (req, res, next) => {
    try {
      const message = await tradeProposalService.postMessage(req.params.proposalId, req.user.id, true, req.body.message);
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },

  triggerValuationRecalculation: async (req, res, next) => {
    try {
      const results = await recalculateCategoryPrices('admin_manual_trigger');
      res.json({
        success: true,
        message: 'Valuation recalculation complete.',
        data: results,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminController;
