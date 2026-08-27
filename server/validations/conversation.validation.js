'use strict';

/**
 * validations/conversation.validation.js — Per-Trade Direct Messaging Input Validation
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

const validateConversationId = [
  param('id').isMongoId().withMessage('Invalid conversation id'),
  validate,
];

const validatePostMessage = [
  param('id').isMongoId().withMessage('Invalid conversation id'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('A message is required')
    .isLength({ max: 2000 })
    .withMessage('Message must be under 2000 characters'),
  validate,
];

module.exports = { validateConversationId, validatePostMessage };
