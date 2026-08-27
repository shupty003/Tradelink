'use strict';

/**
 * validations/want.validation.js — Multi-Party Trade Chains ("wants") Input Validation
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

const validateCreateWant = [
  body('category')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Category is required'),

  body('customCategoryName')
    .if(body('category').equals('other'))
    .trim()
    .notEmpty()
    .withMessage('Custom category name is required when category is "other"')
    .isLength({ max: 100 })
    .withMessage('Custom category name must be under 100 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be under 500 characters'),

  validate,
];

const validateWantId = [
  param('id').isMongoId().withMessage('Invalid want id'),
  validate,
];

module.exports = { validateCreateWant, validateWantId };
