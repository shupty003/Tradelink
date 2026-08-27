/**
 * Helper to generate a 100% free direct Google Calendar event creation URL.
 *
 * @param {{
 *   title: string,
 *   details?: string,
 *   location?: string,
 *   startTime: string | Date,
 *   durationMinutes?: number
 * }} opts
 * @returns {string} Google Calendar web URL
 */
export const getGoogleCalendarUrl = ({
  title,
  details = '',
  location = 'TradeLink Online Session',
  startTime,
  durationMinutes = 60,
}) => {
  if (!startTime) {return '';}

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {return '';}

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatDateForGCal = d => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDateForGCal(start)}/${formatDateForGCal(end)}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
