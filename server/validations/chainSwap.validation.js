'use strict';

/**
 * validations/chainSwap.validation.js — Multi-Party Trade Chains (barter settlement) Input Validation
 */

const { body, param, validationResult } = require('express-validator');

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

const validateProposeSwap = [
  body('listingId').isMongoId().withMessage('A valid listingId is required'),
  body('scheduledAt').isISO8601().withMessage('A valid session date/time is required'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be under 500 characters'),
  validate,
];

const validateSwapId = [
  param('id').isMongoId().withMessage('Invalid swap id'),
  validate,
];

module.exports = { validateProposeSwap, validateSwapId };
