'use strict';

/**
 * routes/want.routes.js — Multi-Party Trade Chains ("wants") Routes
 *
 * POST   /api/wants        → add something you're looking for
 * GET    /api/wants/mine   → your own wants
 * DELETE /api/wants/:id    → remove a want
 */

const express = require('express');
const wantController = require('../controllers/want.controller');
const { protect } = require('../middleware/auth');
const { validateCreateWant, validateWantId } = require('../validations/want.validation');

const router = express.Router();

router.post('/', protect, validateCreateWant, wantController.createWant);
router.get('/mine', protect, wantController.getMyWants);
router.delete('/:id', protect, validateWantId, wantController.deleteWant);

module.exports = router;
