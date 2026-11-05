import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';

// Fix Vite asset URLs for Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface InteractiveGeofenceMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onRadiusChange?: (radius: number) => void;
  isInteractive?: boolean;
  locationName?: string;
}

export const PRESET_HUBS = [
  { name: 'Puducherry (SMVEC / Central)', lat: 11.9416, lng: 79.8083 },
  { name: 'Chennai (Siruseri / OMR)', lat: 12.8284, lng: 80.2198 },
  { name: 'Bengaluru (Electronic City)', lat: 12.8399, lng: 77.6770 },
  { name: 'Hyderabad (Hitec City)', lat: 17.4474, lng: 78.3762 },
];

export const InteractiveGeofenceMap: React.FC<InteractiveGeofenceMapProps> = ({
  latitude,
  longitude,
  radiusMeters,
  onCoordinatesChange,
  onRadiusChange,
  isInteractive = true,
  locationName = 'Geofence Location',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Validation
  const isLatValid = !isNaN(latitude) && latitude >= -90 && latitude <= 90;
  const isLngValid = !isNaN(longitude) && longitude >= -180 && longitude <= 180;
  const isRadiusValid = !isNaN(radiusMeters) && radiusMeters >= 20 && radiusMeters <= 5000;
  const isValidConfig = isLatValid && isLngValid && isRadiusValid;

  const validLat = isLatValid ? latitude : 11.9416;
  const validLng = isLngValid ? longitude : 79.8083;
  const validRadius = isRadiusValid ? radiusMeters : 150;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if container already initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [validLat, validLng],
      zoom: 15,
      zoomControl: isInteractive,
      scrollWheelZoom: isInteractive,
      dragging: isInteractive,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Initial Marker
    const marker = L.marker([validLat, validLng], {
      draggable: isInteractive,
      title: locationName,
    }).addTo(map);

    // Initial Geofence Circle
    const circle = L.circle([validLat, validLng], {
      radius: validRadius,
      color: '#24389C',
      fillColor: '#24389C',
      fillOpacity: 0.18,
      weight: 2,
      dashArray: '4, 4',
    }).addTo(map);

    // Handle marker dragend
    if (isInteractive) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        circle.setLatLng(pos);
        onCoordinatesChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      // Handle map click
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        onCoordinatesChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    // Force map invalidation on mount for proper sizing
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map position when external coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    if (isLatValid && isLngValid) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - latitude) > 0.00001 || Math.abs(currentPos.lng - longitude) > 0.00001) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude, isLatValid, isLngValid]);

  // Update circle radius when radius changes
  useEffect(() => {
    if (circleRef.current && isRadiusValid) {
      circleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters, isRadiusValid]);

  return (
    <div className="space-y-3">
      {/* Quick Presets for HOD */}
      {isInteractive && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#57657A] flex items-center space-x-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-[#24389C]" />
            <span>Preset Tech Hubs:</span>
          </span>
          {PRESET_HUBS.map((hub) => (
            <button
              key={hub.name}
              type="button"
              onClick={() => {
                onCoordinatesChange(hub.lat, hub.lng);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([hub.lat, hub.lng], 15);
                }
              }}
              className="px-2.5 py-1 text-[11px] font-medium bg-[#EFEDF6] text-[#24389C] rounded-md hover:bg-[#DEE0FF] transition-all border border-[#E3E1EA]"
            >
              {hub.name}
            </button>
          ))}
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-[#E3E1EA] shadow-xs">
        <div ref={mapContainerRef} className="w-full h-80 z-0" />

        {/* Live Coordinates & Geofence Badge Overlay */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-[#E3E1EA] shadow-md z-[500] text-xs space-y-1 min-w-[210px]">
          <div className="flex items-center justify-between font-bold text-[#1A1B22] border-b border-[#E3E1EA] pb-1">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-[#24389C]" />
              <span>Geofence Boundary</span>
            </span>
            {isValidConfig ? (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center space-x-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Valid</span>
              </span>
            ) : (
              <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 flex items-center space-x-0.5">
                <AlertCircle className="w-3 h-3" />
                <span>Invalid</span>
              </span>
            )}
          </div>

          <div className="font-mono text-[11px] text-[#57657A] flex justify-between">
            <span>Latitude:</span>
            <strong className="text-[#1A1B22]">{isLatValid ? latitude.toFixed(6) : 'Invalid'}°</strong>
          </div>
          <div className="font-mono text-[11px] text-[#57657A] flex justify-between">
            <span>Longitude:</span>
            <strong className="text-[#1A1B22]">{isLngValid ? longitude.toFixed(6) : 'Invalid'}°</strong>
          </div>
          <div className="font-mono text-[11px] text-[#57657A] flex justify-between">
            <span>Radius:</span>
            <strong className="text-[#24389C] font-bold">{isRadiusValid ? `${radiusMeters} m` : 'Invalid'}</strong>
          </div>

          {isInteractive && (
            <div className="text-[10px] text-[#757684] pt-1 border-t border-[#E3E1EA] italic">
              💡 Click map or drag marker to reposition
            </div>
          )}
        </div>

        {/* Validation Error Banner if Invalid */}
        {!isValidConfig && (
          <div className="absolute bottom-3 left-3 right-3 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg z-[500] text-xs flex items-center space-x-2 shadow-md">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <strong>Invalid Configuration:</strong>{' '}
              {!isLatValid && 'Latitude must be between -90° and +90°. '}
              {!isLngValid && 'Longitude must be between -180° and +180°. '}
              {!isRadiusValid && 'Radius must be between 20m and 5000m.'}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Radius Slider */}
      {isInteractive && onRadiusChange && (
        <div className="bg-[#FBF8FF] p-3 rounded-xl border border-[#E3E1EA] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#1A1B22] flex items-center space-x-1.5">
              <span>Geofence Radius (Meters)</span>
              <span className="text-[10px] text-[#57657A] font-normal">(Min 20m • Max 2000m)</span>
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="20"
                max="5000"
                step="10"
                value={radiusMeters}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="w-20 px-2 py-1 text-xs font-mono font-bold text-right rounded border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
              />
              <span className="text-xs text-[#57657A] font-medium">m</span>
            </div>
          </div>

          <input
            type="range"
            min="25"
            max="1000"
            step="25"
            value={radiusMeters}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full accent-[#24389C] cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-[#757684]">
            <span>25m (Tight Office)</span>
            <span>150m (Standard Facility)</span>
            <span>500m (Large Campus)</span>
            <span>1000m (Industrial Zone)</span>
          </div>
        </div>
      )}
    </div>
  );
};

