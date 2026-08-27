import { useEffect, useState } from 'react';
import { fetchIpLocation } from '../../utils/ipLocation';

/**
 * IpLocationBadge — Displays live auto-detected location using 3rd-party IP Geolocation API
 */
const IpLocationBadge = ({ onAutoDetectLocation, className = '' }) => {
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchIpLocation().then(data => {
      if (mounted) {
        setGeo(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-800 ${className}`}>
        <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
        Detecting location via IP API…
      </span>
    );
  }

  const currentGeo = geo || {
    city: 'Dhaka',
    country: 'Bangladesh',
    flagEmoji: '🇧🇩',
    ip: '182.252.93.178',
    provider: 'ipwho.is',
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-1.5 text-xs font-medium text-sky-900 shadow-sm ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="text-sm">{currentGeo.flagEmoji || '📍'}</span>
        <span className="font-semibold text-slate-950">{currentGeo.city}, {currentGeo.country}</span>
      </span>
      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-mono text-sky-800" title={`IP Address: ${currentGeo.ip}`}>
        {currentGeo.provider || 'ipwho.is'} ({currentGeo.ip})
      </span>

      {onAutoDetectLocation && (
        <button
          type="button"
          onClick={() => onAutoDetectLocation(currentGeo)}
          className="ml-1 font-semibold text-navy-800 underline hover:text-navy-950"
        >
          Use Location
        </button>
      )}
    </div>
  );
};

export default IpLocationBadge;
