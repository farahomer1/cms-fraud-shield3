// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useState } from 'react';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import { APIProvider, Map, AdvancedMarker, InfoWindow, ColorScheme } from '@vis.gl/react-google-maps';

interface RegionalCenter {
  name: string;
  lat: number;
  lng: number;
  claimsPerDay: number;
}

const VA_REGIONAL_CENTERS: RegionalCenter[] = [
  { name: 'Washington DC', lat: 38.9, lng: -77.0, claimsPerDay: 12400 },
  { name: 'Tampa', lat: 27.95, lng: -82.46, claimsPerDay: 9800 },
  { name: 'Denver', lat: 39.74, lng: -104.99, claimsPerDay: 7200 },
  { name: 'San Francisco', lat: 37.77, lng: -122.42, claimsPerDay: 8600 },
  { name: 'Minneapolis', lat: 44.98, lng: -93.27, claimsPerDay: 6100 },
  { name: 'Atlanta', lat: 33.75, lng: -84.39, claimsPerDay: 10200 },
  { name: 'Chicago', lat: 41.88, lng: -87.63, claimsPerDay: 9400 },
  { name: 'Boston', lat: 42.36, lng: -71.06, claimsPerDay: 7800 },
  { name: 'Seattle', lat: 47.61, lng: -122.33, claimsPerDay: 5400 },
  { name: 'Dallas', lat: 32.78, lng: -96.80, claimsPerDay: 11300 },
];

const US_CENTER = { lat: 39.5, lng: -98.35 };


const PulsingMarker: React.FC<{ center: RegionalCenter }> = ({ center }) => {
  return (
    <div style={{ position: 'relative', cursor: 'pointer' }}>
      {/* Pulsing ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid #02BFE7',
          animation: 'pulse-ring 2.5s ease-in-out infinite',
          opacity: 0.5,
        }}
      />
      {/* Center dot */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#02BFE7',
          border: '2px solid #FFFFFF',
          boxShadow: '0 0 8px rgba(2,191,231,0.7)',
        }}
      />
      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: -32,
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: '"Source Sans 3","Source Sans Pro",sans-serif',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          }}
        >
          {center.name}
        </div>
        <div
          style={{
            color: 'rgba(2,191,231,0.8)',
            fontSize: 9,
            fontFamily: '"Source Sans 3","Source Sans Pro",sans-serif',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {center.claimsPerDay.toLocaleString()} claims/day
        </div>
      </div>
    </div>
  );
};

const USTrafficMap: React.FC = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [selectedCenter, setSelectedCenter] = useState<RegionalCenter | null>(null);

  const handleMarkerClick = useCallback((center: RegionalCenter) => {
    setSelectedCenter(center);
  }, []);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedCenter(null);
  }, []);

  if (!apiKey) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Typography variant="subtitle1" fontWeight={600} color="primary.dark">
              Medicare Administrative Contractors (MACs)
            </Typography>
          }
          sx={{ pb: 0 }}
        />
        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Map unavailable: Google Maps API key not configured.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Typography variant="subtitle1" fontWeight={600} color="primary.dark">
            Medicare Administrative Contractors (MACs)
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Live claim traffic across the nation
          </Typography>
        }
        sx={{ pb: 0 }}
      />
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          '&:last-child': { pb: 0 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: 340,
            borderRadius: 1,
            mx: 2,
            mb: 2,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* CSS animation for pulsing markers */}
          <style>{`
            @keyframes pulse-ring {
              0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.7; }
              50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
              100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.7; }
            }
          `}</style>
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={US_CENTER}
              defaultZoom={4}
              mapId="va-traffic-map"
              colorScheme={ColorScheme.DARK}
              gestureHandling="cooperative"
              disableDefaultUI={true}
              zoomControl={true}
              backgroundColor="#112E51"
            >
              {VA_REGIONAL_CENTERS.map((center) => (
                <AdvancedMarker
                  key={center.name}
                  position={{ lat: center.lat, lng: center.lng }}
                  onClick={() => handleMarkerClick(center)}
                >
                  <PulsingMarker center={center} />
                </AdvancedMarker>
              ))}

              {selectedCenter && (
                <InfoWindow
                  position={{ lat: selectedCenter.lat, lng: selectedCenter.lng }}
                  onCloseClick={handleInfoWindowClose}
                  pixelOffset={[0, -40]}
                >
                  <div style={{ padding: 4, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#003F72', marginBottom: 4 }}>
                      {selectedCenter.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#333' }}>
                      <strong>{selectedCenter.claimsPerDay.toLocaleString()}</strong> claims/day
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>

          {/* Legend overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'rgba(17, 46, 81, 0.85)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#02BFE7',
                opacity: 0.8,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 10,
                fontFamily: '"Source Sans 3","Source Sans Pro",sans-serif',
              }}
            >
              Regional Processing Center
            </Typography>
          </Box>

          {/* Total volume overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(17, 46, 81, 0.85)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              zIndex: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 10,
                fontFamily: '"Source Sans 3","Source Sans Pro",sans-serif',
              }}
            >
              Total: ~88,200 claims/day across 10 centers
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default USTrafficMap;
