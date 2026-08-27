'use strict';

/**
 * routes/chainSwap.routes.js — Multi-Party Trade Chains (barter settlement) Routes
 *
 * POST   /api/chain-swaps            → propose a no-money skill swap (one chain leg)
 * GET    /api/chain-swaps/sent       → swaps I sent (as requester)
 * GET    /api/chain-swaps/received   → swaps sent to my listings (as provider)
 * PATCH  /api/chain-swaps/:id/accept → provider accepts
 * PATCH  /api/chain-swaps/:id/decline→ provider declines
 * PATCH  /api/chain-swaps/:id/confirm→ either party confirms the session happened
 * DELETE /api/chain-swaps/:id        → requester cancels while pending
 */

const express = require('express');
const chainSwapController = require('../controllers/chainSwap.controller');
const { protect } = require('../middleware/auth');
const { validateProposeSwap, validateSwapId } = require('../validations/chainSwap.validation');

const router = express.Router();

router.post('/', protect, validateProposeSwap, chainSwapController.proposeSwap);
router.get('/sent', protect, chainSwapController.getSent);
router.get('/received', protect, chainSwapController.getReceived);
router.patch('/:id/accept', protect, validateSwapId, chainSwapController.accept);
router.patch('/:id/decline', protect, validateSwapId, chainSwapController.decline);
router.patch('/:id/confirm', protect, validateSwapId, chainSwapController.confirm);
router.delete('/:id', protect, validateSwapId, chainSwapController.cancel);

module.exports = router;
