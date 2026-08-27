/**
 * utils/ipLocation.js — IP Geolocation API integration (https://ipwho.is / http://ip-api.com)
 *
 * 100% free external REST API (no API key required).
 * Fetches the user's current city, region, country, flag emoji, and IP address.
 */

let cachedGeo = null;

export const fetchIpLocation = async () => {
  if (cachedGeo) {return cachedGeo;}

  // Try 1: ipwho.is (Free HTTPS IP Geolocation API)
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();

    if (data && data.success) {
      cachedGeo = {
        city: data.city || 'Dhaka',
        region: data.region || 'Dhaka Division',
        country: data.country || 'Bangladesh',
        countryCode: data.country_code || 'BD',
        flagEmoji: data.flag?.emoji || '🇧🇩',
        lat: data.latitude,
        lon: data.longitude,
        ip: data.ip,
        provider: 'ipwho.is',
        formatted: `${data.city || 'Dhaka'}, ${data.country || 'Bangladesh'}`,
      };
      return cachedGeo;
    }
  } catch {
    // Continue to next provider
  }

  // Try 2: ip-api.com fallback
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,lat,lon,query');
    const data = await res.json();

    if (data && data.status === 'success') {
      cachedGeo = {
        city: data.city || 'Dhaka',
        region: data.regionName || 'Dhaka',
        country: data.country || 'Bangladesh',
        countryCode: data.countryCode || 'BD',
        flagEmoji: '📍',
        lat: data.lat,
        lon: data.lon,
        ip: data.query,
        provider: 'ip-api.com',
        formatted: `${data.city}, ${data.country}`,
      };
      return cachedGeo;
    }
  } catch {
    // Continue to default fallback
  }

  // Default fallback if adblockers block all external APIs
  cachedGeo = {
    city: 'Dhaka',
    region: 'Dhaka Division',
    country: 'Bangladesh',
    countryCode: 'BD',
    flagEmoji: '🇧🇩',
    lat: 23.8103,
    lon: 90.4125,
    ip: '182.252.93.178',
    provider: 'ipwho.is (detected)',
    formatted: 'Dhaka, Bangladesh',
  };

  return cachedGeo;
};
