'use strict';

/**
 * validations/user.validation.js — User Profile Input Validation
 */

const { body, validationResult } = require('express-validator');

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

const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone number cannot exceed 30 characters'),

  body('avatar')
    .optional()
    .trim(),

  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('location.lat')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.lng')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  validate,
];

module.exports = { validateUpdateProfile };
