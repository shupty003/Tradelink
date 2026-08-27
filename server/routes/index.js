/**
 * routes/index.js — Root API Router
 *
 * Mounts all feature routers under their respective paths.
 * Add new feature routers here as the app grows.
 *
 * Team note: coordinate with team when adding new entries.
 */

'use strict';

const express = require('express');

const authRoutes             = require('./auth.routes');
const userRoutes             = require('./user.routes');
const projectRoutes          = require('./project.routes');
const procurementRoutes      = require('./procurement.routes');
const commercialRoutes       = require('./commercial.routes');
const valuationRoutes        = require('./valuation.routes');
const skillListingRoutes     = require('./skillListing.routes');
const categoryBrowsingRoutes = require('./categoryBrowsing.routes');
const tradeProposalRoutes    = require('./tradeProposal.routes');
const transactionRoutes      = require('./transaction.routes');
const creditWalletRoutes     = require('./creditWallet.routes');
const reputationRoutes       = require('./reputation.routes');
const adminRoutes            = require('./admin.routes');
const watchlistRoutes        = require('./watchlist.routes');
const paymentRoutes          = require('./payment.routes');
const notificationRoutes     = require('./notification.routes');
const wantRoutes             = require('./want.routes');
const tradeChainRoutes       = require('./tradeChain.routes');
const chainSwapRoutes        = require('./chainSwap.routes');
const conversationRoutes     = require('./conversation.routes');

const router = express.Router();

// ─── Feature Route Mounts ─────────────────────────────────────────────────────
router.use('/auth',            authRoutes);
router.use('/users',           userRoutes);
router.use('/projects',        projectRoutes);
router.use('/procurement',     procurementRoutes);
router.use('/commercial',      commercialRoutes);
router.use('/valuations',      valuationRoutes);
router.use('/skill-listings',  skillListingRoutes);
router.use('/browse',          categoryBrowsingRoutes);
router.use('/trade-proposals', tradeProposalRoutes);
router.use('/transactions',    transactionRoutes);
router.use('/wallet',          creditWalletRoutes);
router.use('/reputation',      reputationRoutes);
router.use('/admin',           adminRoutes);
router.use('/watchlist',       watchlistRoutes);
router.use('/payments',        paymentRoutes);
router.use('/notifications',   notificationRoutes);
router.use('/wants',           wantRoutes);
router.use('/trade-chains',    tradeChainRoutes);
router.use('/chain-swaps',     chainSwapRoutes);
router.use('/conversations',   conversationRoutes);

module.exports = router;
