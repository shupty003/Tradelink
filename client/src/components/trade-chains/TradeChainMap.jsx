/**
 * components/trade-chains/TradeChainMap.jsx — In-Person Meeting Point Suggestion
 *
 * Renders a small Leaflet map showing every chain participant's approximate
 * location plus the suggested meeting point (the geographic centroid —
 * services/tradeChain.service.js computes this server-side and only
 * includes it when every participant has opted into location sharing).
 */

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const PARTICIPANT_COLOR = '#1e3a5f'; // navy
const MEETING_POINT_COLOR = '#b45309'; // amber

const TradeChainMap = ({ meetingPoint, participants, myLocation, myName = 'You' }) => {
  const points = [
    myLocation && { lat: myLocation.lat, lng: myLocation.lng, label: myName },
    ...participants.map(p => p.user.location && { lat: p.user.location.lat, lng: p.user.location.lng, label: p.user.name }),
  ].filter(Boolean);

  if (!meetingPoint || points.length === 0) {return null;}

  return (
    <div className="overflow-hidden rounded-lg border border-concrete-200">
      <MapContainer
        center={[meetingPoint.lat, meetingPoint.lng]}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: '260px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, idx) => (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{ color: PARTICIPANT_COLOR, fillColor: PARTICIPANT_COLOR, fillOpacity: 0.8 }}
          >
            <Popup>{point.label}</Popup>
          </CircleMarker>
        ))}
        <CircleMarker
          center={[meetingPoint.lat, meetingPoint.lng]}
          radius={10}
          pathOptions={{ color: MEETING_POINT_COLOR, fillColor: MEETING_POINT_COLOR, fillOpacity: 0.9 }}
        >
          <Popup>Suggested meeting point</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
};

export default TradeChainMap;
