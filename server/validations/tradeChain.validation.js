'use strict';

/**
 * validations/tradeChain.validation.js — Multi-Party Trade Chains Input Validation
 */

const { body, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateSearch = [
  query('wantId').isMongoId().withMessage('A valid wantId is required'),
  validate,
];

const validateNotify = [
  body('wantId').isMongoId().withMessage('A valid wantId is required'),
  body('closingListingId').isMongoId().withMessage('A valid closingListingId is required'),
  body('participants').isArray({ min: 1 }).withMessage('participants must be a non-empty array'),
  body('participants.*.userId').isMongoId().withMessage('Each participant needs a valid userId'),
  body('participants.*.listingId').isMongoId().withMessage('Each participant needs a valid listingId'),
  validate,
];

module.exports = { validateSearch, validateNotify };
