'use strict';

/**
 * validations/notification.validation.js — Notification Input Validation
 */

const { param, query, validationResult } = require('express-validator');

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

const validateNotificationId = [
  param('id').isMongoId().withMessage('Invalid notification id'),
  validate,
];

const validateCategory = [
  query('category').optional().isIn(['request', 'transaction', 'profile', 'message']).withMessage('Invalid category'),
  validate,
];

module.exports = { validateNotificationId, validateCategory };
