'use strict';

/**
 * services/transaction.service.js — Escrow System + Manual Payment (Offline / bKash)
 *
 * Lifecycle of a transaction (opened the instant a trade proposal is
 * accepted — see tradeProposal.service.js's acceptProposal):
 *
 *   pending             →  the provider still owes the service
 *   delivered           →  provider confirmed delivery; waiting on the buyer
 *   awaiting_payment    →  buyer confirmed receipt; ready to pay
 *   payment_submitted   →  buyer submitted a bKash Transaction ID; waiting
 *                           on the provider to verify it
 *   paid                →  funds now count toward the provider's income —
 *                           reached instantly for offline payment (the
 *                           buyer's own confirmation is trusted), or once
 *                           the provider verifies a submitted bKash
 *                           Transaction ID
 *   payment_failed      →  reserved for the legacy SSLCommerz webhook path
 *                           (see finalizePayment/markPaymentFailed below,
 *                           and payment.controller.js) — unreachable from
 *                           the active offline/bKash flow
 *
 * Each step is only reachable from the previous one — the buyer can't
 * confirm receipt before the provider confirms delivery, and can't pay
 * before confirming receipt. Offline payment is a one-step, trust-based
 * confirmation; bKash payment requires the provider to independently
 * verify the submitted Transaction ID before funds count as released.
 *
 * The instant a payment is confirmed (status → 'paid'), both the
 * requester and the provider earn Credit Wallet credits from it (see
 * creditWallet.service.js) — that's what "completing a trade" means for
 * the Credit Wallet System.
 */

const Transaction = require('../models/Transaction.model');
const sslcommerzService = require('./sslcommerz.service');
const creditWalletService = require('./creditWallet.service');
const notificationService = require('./notification.service');
const conversationService = require('./conversation.service');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Confirms the user is a party to the transaction and returns which side. */
const assertParty = (transaction, userId) => {
  const isRequester =
    transaction.requester.toString() === userId;

  const isProvider =
    transaction.provider.toString() === userId;

  if (!isRequester && !isProvider) {
    throw ApiError.forbidden(
      'You are not part of this transaction'
    );
  }

  return {
    isRequester,
    isProvider,
  };
};

/** Shorthand for the 'transaction' category notifications fired at each lifecycle step below. */
const notifyTransactionStep = (userId, type, title, message, transaction) =>
  notificationService.notify(userId, {
    category: 'transaction',
    type,
    title,
    message,
    link: '/dashboard/transactions',
    relatedTransaction: transaction._id,
  });

/** Awards Credit Wallet credits to both sides the instant a transaction's payment is confirmed. */
const awardCompletionCredits = async transaction => {
  const credits = creditWalletService.creditsForTradeValue(transaction.amount);
  await creditWalletService.earnCredits(
    transaction.requester,
    credits,
    `Completed trade as requester — "${transaction.listingTitle}"`,
    { relatedTransaction: transaction._id }
  );
  await creditWalletService.earnCredits(
    transaction.provider,
    credits,
    `Completed trade as provider — "${transaction.listingTitle}"`,
    { relatedTransaction: transaction._id }
  );
};

// ─── Service ──────────────────────────────────────────────────────────────────

const transactionService = {
  /**
   * Called when a trade proposal is accepted.
   * Opens the escrow transaction.
   */
  createForProposal: async proposal => {
    const existing = await Transaction.findOne({
      tradeProposal: proposal._id,
    });

    if (existing) {
      return existing;
    }

    const transaction = await Transaction.create({
      tradeProposal: proposal._id,
      requester: proposal.requester,
      provider: proposal.provider,
      listingTitle: proposal.listingTitle,
      amount: proposal.finalPriceBDT,
    });

    logger.info(
      `[Transaction] Escrow opened for proposal ${proposal._id} — ` +
      `৳${transaction.amount} BDT pending delivery.`
    );

    return transaction;
  },

  /**
   * Every transaction the logged-in user is part of.
   */
  getMyTransactions: async userId => {
    const transactions = await Transaction.find({
      $or: [
        { requester: userId },
        { provider: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('requester', 'name email avatar')
      .populate('provider', 'name email avatar')
      .lean();

    return transactions.map(t => ({
      ...t,
      viewerRole:
        t.requester._id.toString() === userId
          ? 'requester'
          : 'provider',
    }));
  },

  /**
   * Get one transaction.
   */
  getTransactionById: async (id, userId) => {
    const transaction = await Transaction.findById(id)
      .populate('requester', 'name email avatar')
      .populate('provider', 'name email avatar');
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    assertParty(transaction, userId);

    return transaction;
  },

  /**
   * Step 1:
   * Provider confirms that the service was delivered.
   */
  confirmDelivery: async (id, userId) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    const { isProvider } = assertParty(transaction, userId);

    if (!isProvider) {throw ApiError.forbidden('Only the provider can confirm delivery');}
    if (transaction.status !== 'pending') {
      throw ApiError.badRequest(
        `Delivery was already confirmed for this transaction ` +
        `(status: ${transaction.status})`
      );
    }

    transaction.providerConfirmed = true;
    transaction.providerConfirmedAt = new Date();
    transaction.status = 'delivered';

    await transaction.save();

    logger.info(`[Transaction] ${transaction._id} marked delivered by provider.`);
    await notifyTransactionStep(
      transaction.requester,
      'transaction_delivered',
      'Service marked delivered',
      `The provider marked "${transaction.listingTitle}" as delivered — confirm receipt to continue.`,
      transaction
    );
    return transaction;
  },

  /**
   * Step 2:
   * Requester confirms they received the service.
   */
  confirmReceipt: async (id, userId) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    const { isRequester } = assertParty(transaction, userId);

    if (!isRequester) {throw ApiError.forbidden('Only the requester can confirm receipt');}
    if (transaction.status === 'pending') {
      throw ApiError.badRequest(
        "The provider hasn't confirmed delivery yet — " +
        "there's nothing to confirm."
      );
    }

    if (transaction.status !== 'delivered') {
      throw ApiError.badRequest(
        `Receipt was already confirmed for this transaction ` +
        `(status: ${transaction.status})`
      );
    }

    transaction.requesterConfirmed = true;
    transaction.requesterConfirmedAt = new Date();
    transaction.status = 'awaiting_payment';

    await transaction.save();

    logger.info(`[Transaction] ${transaction._id} receipt confirmed by requester — ready for payment.`);
    await notifyTransactionStep(
      transaction.provider,
      'transaction_received',
      'Receipt confirmed',
      `The buyer confirmed receipt for "${transaction.listingTitle}" — payment is next.`,
      transaction
    );
    return transaction;
  },

  /** Step 3, offline path — requester confirms they paid in person/cash. Trusted, one step, no verification needed. */
  confirmOfflinePayment: async (id, userId) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    const { isRequester } = assertParty(transaction, userId);

    if (!isRequester) {throw ApiError.forbidden('Only the requester can confirm payment');}
    if (transaction.status !== 'awaiting_payment') {
      throw ApiError.badRequest(`This transaction isn't ready for payment yet (status: ${transaction.status})`);
    }

    transaction.status = 'paid';
    transaction.payment.method = 'offline';
    transaction.payment.status = 'paid';
    transaction.payment.paidAt = new Date();
    transaction.releasedAt = new Date();
    await transaction.save();

    logger.info(`[Transaction] ${transaction._id} confirmed paid offline by requester.`);
    await awardCompletionCredits(transaction);
    await conversationService.deleteConversation({ relatedType: 'TradeProposal', relatedId: transaction.tradeProposal });
    await notifyTransactionStep(
      transaction.provider,
      'transaction_paid',
      'Payment received',
      `The buyer confirmed an offline payment of ৳${transaction.amount} for "${transaction.listingTitle}".`,
      transaction
    );
    return transaction;
  },

  /** Step 3, bKash path — requester submits a Transaction ID for the provider to verify. */
  submitBkashPayment: async (id, userId, bkashTransactionId) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    const { isRequester } = assertParty(transaction, userId);

    if (!isRequester) {throw ApiError.forbidden('Only the requester can submit a payment');}
    if (transaction.status !== 'awaiting_payment') {
      throw ApiError.badRequest(`This transaction isn't ready for payment yet (status: ${transaction.status})`);
    }

    transaction.status = 'payment_submitted';
    transaction.payment.method = 'bkash';
    transaction.payment.status = 'pending_verification';
    transaction.payment.bkashTransactionId = bkashTransactionId.trim();
    transaction.payment.submittedAt = new Date();
    await transaction.save();

    logger.info(`[Transaction] ${transaction._id} bKash Transaction ID submitted — awaiting provider verification.`);
    await notifyTransactionStep(
      transaction.provider,
      'transaction_payment_submitted',
      'bKash payment submitted',
      `The buyer submitted a bKash Transaction ID for "${transaction.listingTitle}" — please verify it.`,
      transaction
    );
    return transaction;
  },

  /** Provider confirms a submitted bKash Transaction ID matches what they received. */
  verifyBkashPayment: async (id, userId) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    const { isProvider } = assertParty(transaction, userId);

    if (!isProvider) {throw ApiError.forbidden('Only the provider can verify this payment');}
    if (transaction.status !== 'payment_submitted') {
      throw ApiError.badRequest(`There's no bKash payment awaiting verification (status: ${transaction.status})`);
    }

    transaction.status = 'paid';
    transaction.payment.status = 'paid';
    transaction.payment.verifiedAt = new Date();
    transaction.payment.paidAt = new Date();
    transaction.releasedAt = new Date();
    await transaction.save();

    logger.info(`[Transaction] ${transaction._id} bKash payment verified by provider.`);
    await awardCompletionCredits(transaction);
    await conversationService.deleteConversation({ relatedType: 'TradeProposal', relatedId: transaction.tradeProposal });
    await notifyTransactionStep(
      transaction.requester,
      'transaction_paid',
      'Payment verified',
      `Your bKash payment for "${transaction.listingTitle}" was verified — the trade is complete.`,
      transaction
    );
    return transaction;
  },

  /** Provider rejects a submitted bKash Transaction ID (doesn't match) — requester can resubmit or switch method. */
  rejectBkashPayment: async (id, userId) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {throw ApiError.notFound('Transaction not found');}
    const { isProvider } = assertParty(transaction, userId);

    if (!isProvider) {throw ApiError.forbidden('Only the provider can reject this payment');}
    if (transaction.status !== 'payment_submitted') {
      throw ApiError.badRequest(`There's no bKash payment awaiting verification (status: ${transaction.status})`);
    }

    transaction.status = 'awaiting_payment';
    transaction.payment.method = null;
    transaction.payment.status = 'unpaid';
    transaction.payment.bkashTransactionId = null;
    transaction.payment.submittedAt = null;
    await transaction.save();

    logger.info(`[Transaction] ${transaction._id} bKash Transaction ID rejected by provider — requester can retry.`);
    await notifyTransactionStep(
      transaction.requester,
      'transaction_payment_rejected',
      'bKash Transaction ID rejected',
      `Your bKash Transaction ID for "${transaction.listingTitle}" didn't match — please resubmit or pay offline.`,
      transaction
    );
    return transaction;
  },

  /**
   * Finalizes a payment after SSLCommerz validation.
   *
   * Called by success redirect and IPN webhook.
   */
  finalizePayment: async (tranId, valId) => {
    if (!tranId) {return null;}

    if (!transaction) {
      logger.error(
        `[Transaction] Payment callback for unknown ` +
        `tran_id: ${tranId}`
      );

      return null;
    }

    if (transaction.status === 'paid') {return transaction;} // already finalized — idempotent

    let validation;

    try {
      validation =
        await sslcommerzService.validateTransaction(
          valId
        );
    } catch (err) {
      logger.error(
        `[Transaction] SSLCommerz validation call failed ` +
        `for ${transaction._id}: ${err.message}`
      );

      transaction.payment.status = 'failed';
      transaction.status = 'payment_failed';

      await transaction.save();

      return transaction;
    }

    const amountMatches =
      Math.round(validation.amount) ===
      Math.round(transaction.amount);

    if (
      !validation.isValid ||
      !amountMatches
    ) {
      transaction.payment.status = 'failed';

      transaction.payment.gatewayResponse =
        validation.raw;

      transaction.status =
        'payment_failed';

      await transaction.save();

      logger.error(
        `[Transaction] Payment validation failed for ` +
        `${transaction._id} ` +
        `(tran_id=${tranId}, ` +
        `amountMatches=${amountMatches}).`
      );

      return transaction;
    }

    transaction.status = 'paid';

    transaction.payment.status = 'paid';

    logger.info(`[Transaction] Payment confirmed for ${transaction._id} — ৳${transaction.amount} BDT paid to provider.`);

    await awardCompletionCredits(transaction);
    return transaction;
  },

  /** Marks a payment attempt as failed/cancelled so the requester can retry. */
  markPaymentFailed: async tranId => {
    if (!tranId) {return null;}
    const transaction = await Transaction.findOne({ 'payment.tranId': tranId });
    if (!transaction || transaction.status === 'paid') {return transaction;}

    await transaction.save();

    logger.info(
      `[Transaction] Payment confirmed for ` +
      `${transaction._id} — ` +
      `৳${transaction.amount} BDT paid to provider.`
    );

    return transaction;
  },

  /**
   * Marks a payment attempt as failed/cancelled.
   * The requester can retry.
   */
  getMyIncome: async providerId => {
    const paidTransactions = await Transaction.find({ provider: providerId, status: 'paid' })
      .sort({ 'payment.paidAt': -1 })
      .populate('requester', 'name email avatar')
      .lean();

    const transaction =
      await Transaction.findOne({
        'payment.tranId': tranId,
      });

    return { totalIncome, count: paidTransactions.length, transactions: paidTransactions };
  },
};

module.exports = transactionService;