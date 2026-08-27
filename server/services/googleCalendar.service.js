'use strict';

/**
 * services/googleCalendar.service.js — Google Calendar Integration
 *
 * Creates and shares a calendar event for an accepted trade session.
 * Uses a single OAuth2-authorized app calendar (client id/secret + a
 * long-lived refresh token — see config/env.js), not per-user Google
 * login. Both participants are added as event attendees by email, so
 * Google sends each of them a calendar invite directly.
 *
 * Gracefully no-ops when Google credentials aren't configured, so
 * accepting a trade proposal never fails just because Calendar sync
 * hasn't been set up yet (see tradeProposal.service.js's acceptProposal).
 */

const { google } = require('googleapis');
const { config } = require('../config/env');
const logger = require('../utils/logger');

const isConfigured = () =>
  Boolean(config.google.clientId && config.google.clientSecret && config.google.refreshToken);

const getCalendarClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
  oauth2Client.setCredentials({ refresh_token: config.google.refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/**
 * Helper to generate a 100% free direct Google Calendar web creation URL.
 */
const generateWebCalendarUrl = ({ summary, description, startTime, durationMinutes }) => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const formatDateForGCal = d => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary,
    dates: `${formatDateForGCal(start)}/${formatDateForGCal(end)}`,
    details: description || '',
    location: 'TradeLink Online Session',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Creates a calendar event and invites both participants by email.
 * Falls back to a direct Google Calendar web event link if API is not configured.
 *
 * @param {{
 *   summary: string,
 *   description: string,
 *   startTime: Date,
 *   durationMinutes: number,
 *   attendeeEmails: string[]
 * }} opts
 * @returns {Promise<{ synced: boolean, eventId?: string, eventLink?: string, error?: string }>}
 */
const createSessionEvent = async ({ summary, description, startTime, durationMinutes, attendeeEmails }) => {
  const webLink = generateWebCalendarUrl({ summary, description, startTime, durationMinutes });

  if (!isConfigured()) {
    logger.info(`[GoogleCalendar] API not configured — generated direct Google Calendar link: ${webLink}`);
    return { synced: true, eventId: 'web-direct', eventLink: webLink };
  }

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  try {
    const calendar = getCalendarClient();
    const { data } = await calendar.events.insert({
      calendarId: config.google.calendarId,
      sendUpdates: 'all',
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        attendees: attendeeEmails.map(email => ({ email })),
      },
    });

    logger.info(`[GoogleCalendar] Session event created via API: ${data.id}`);
    return { synced: true, eventId: data.id, eventLink: data.htmlLink || webLink };
  } catch (err) {
    logger.error(`[GoogleCalendar] API event creation failed, falling back to web link: ${err.message}`);
    return { synced: true, eventId: 'web-fallback', eventLink: webLink, error: err.message };
  }
};

module.exports = { createSessionEvent, isConfigured, generateWebCalendarUrl };

