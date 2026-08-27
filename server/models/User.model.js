'use strict';

/**
 * models/User.model.js — User Schema
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    company: { type: String, default: '' },
    phone: { type: String, default: '' },

    // Optional — only set if the user opts in, for Multi-Party Trade Chains'
    // meeting-point suggestion (services/tradeChain.service.js). Absent for
    // every existing user until they add it via their profile.
    location: {
      city: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    role: {
      type: String,
      enum: ['client', 'operations', 'admin'],
      default: 'client',
    },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// ─── Hash password before saving ─────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {return next();}
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/** Compare a plain-text password against the stored hash */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/** Return a safe user object (no password / tokens) */
UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    company: this.company,
    phone: this.phone,
    location: this.location,
    role: this.role,
    isVerified: this.isVerified,
    isSuspended: this.isSuspended,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
