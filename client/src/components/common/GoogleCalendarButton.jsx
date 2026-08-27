import { getGoogleCalendarUrl } from '../../utils/calendar';

/**
 * A button component that opens Google Calendar prefilled with session details.
 */
const GoogleCalendarButton = ({
  title,
  details,
  location,
  startTime,
  durationMinutes = 60,
  eventLink,
  className = '',
  size = 'sm',
}) => {
  const url = eventLink || getGoogleCalendarUrl({ title, details, location, startTime, durationMinutes });

  if (!url) {return null;}

  const sizeClasses = size === 'xs' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 shadow-sm transition-all hover:bg-emerald-100 hover:border-emerald-300 hover:shadow ${sizeClasses} ${className}`}
      title="Add scheduled session to Google Calendar"
    >
      <svg className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z" />
      </svg>
      <span>Add to Google Calendar</span>
    </a>
  );
};

export default GoogleCalendarButton;
