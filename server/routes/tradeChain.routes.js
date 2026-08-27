'use strict';

/**
 * routes/tradeChain.routes.js — Multi-Party Trade Chains Routes
 *
 * GET  /api/trade-chains/search?wantId= → find chains that close a loop back to one of your open wants
 * POST /api/trade-chains/notify         → after proposing your own leg, notify the rest of a chosen chain
 */

const express = require('express');
const tradeChainController = require('../controllers/tradeChain.controller');
const { protect } = require('../middleware/auth');
const { validateSearch, validateNotify } = require('../validations/tradeChain.validation');

const router = express.Router();

router.get('/search', protect, validateSearch, tradeChainController.search);
router.post('/notify', protect, validateNotify, tradeChainController.notify);

module.exports = router;
