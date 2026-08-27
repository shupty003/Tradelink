'use strict';

/**
 * routes/admin.routes.js — Admin API Routes
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin.middleware');

// All routes require login + admin role
router.use(protect, requireAdmin);

// Platform stats & valuation trigger
router.get('/stats', adminController.getPlatformStats);
router.post('/valuation/recalculate', adminController.triggerValuationRecalculation);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/:userId/suspend', adminController.toggleUserSuspend);
router.patch('/users/:userId/verify', adminController.toggleUserVerification);

// Category management
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:categoryId', adminController.updateCategory);

// Trade proposals & dispute resolution
router.get('/trades', adminController.getTradeProposals);
router.get('/trades/:proposalId', adminController.getDisputeDetail);
router.post('/trades/:proposalId/resolve', adminController.resolveDispute);
router.post('/trades/:proposalId/suspend-both', adminController.suspendDisputeParties);
router.get('/trades/:proposalId/messages', adminController.getDisputeMessages);
router.post('/trades/:proposalId/messages', adminController.postDisputeMessage);

module.exports = router;
