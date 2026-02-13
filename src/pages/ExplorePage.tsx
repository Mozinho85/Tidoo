import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Fab,
  Badge,
  Autocomplete,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MapIcon from '@mui/icons-material/Map';
import ListIcon from '@mui/icons-material/ViewList';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useApp } from '../AppContext.tsx';
import { searchPlaces, autocomplete, type AutocompleteSuggestion } from '../api.ts';
import type { Place } from '../types.ts';
import PlaceCard from '../components/PlaceCard.tsx';
import PlaceDetailDrawer from '../components/PlaceDetailDrawer.tsx';

const CATEGORY_CHIPS = [
  { label: 'Attractions', type: 'tourist_attraction', query: 'tourist attractions' },
  { label: 'Restaurants', type: 'restaurant', query: 'restaurants' },
  { label: 'Museums', type: 'museum', query: 'museums' },
  { label: 'Parks', type: 'park', query: 'parks' },
  { label: 'Nightlife', type: 'night_club', query: 'nightlife bars clubs' },
  { label: 'Shopping', type: 'shopping_mall', query: 'shopping' },
  { label: 'Cafés', type: 'cafe', query: 'cafes coffee shops' },
  { label: 'Entertainment', type: 'amusement_park', query: 'entertainment fun activities' },
];

export default function ExplorePage() {
  const { userLocation, locationError, requestLocation, activeItinerary } = useApp();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const map = useMap();

  // Autocomplete as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await autocomplete(
        searchInput,
        userLocation ?? undefined,
      );
      setSuggestions(results);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, userLocation]);

  const doSearch = useCallback(
    async (query: string, type?: string) => {
      if (!userLocation) {
        setError('Location required. Please enable location access.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const results = await searchPlaces(query, userLocation, { type });
        setPlaces(results);
        if (results.length === 0) {
          setError('No places found. Try a different search.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [userLocation],
  );

  const handleSearch = () => {
    if (searchInput.trim()) {
      setActiveCategory('');
      doSearch(searchInput.trim());
    }
  };

  const handleCategoryClick = (cat: (typeof CATEGORY_CHIPS)[number]) => {
    setActiveCategory(cat.type);
    setSearchInput(cat.query);
    doSearch(cat.query, cat.type);
  };

  // Auto-search on first load
  useEffect(() => {
    if (userLocation && places.length === 0 && !loading) {
      doSearch('things to do');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // Fit map to markers
  useEffect(() => {
    if (!map || places.length === 0) return;
    const bounds = new (window as any).google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.location.latitude, lng: p.location.longitude }));
    if (userLocation) bounds.extend(userLocation);
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [map, places, userLocation]);

  const itineraryCount = activeItinerary.places.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search bar */}
      <Box sx={{ p: 2, pb: 1, bgcolor: 'background.paper', zIndex: 10 }}>
        <Autocomplete
          freeSolo
          options={suggestions
            .filter((s) => s.placePrediction)
            .map((s) => s.placePrediction!.text.text)}
          inputValue={searchInput}
          onInputChange={(_, val) => setSearchInput(val)}
          onChange={(_, val) => {
            if (val) {
              setSearchInput(val);
              setActiveCategory('');
              doSearch(val);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for activities, food, places..."
              size="small"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              slotProps={{
                input: {
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
          PaperComponent={(props) => <Paper {...props} elevation={4} />}
        />

        {/* Category chips */}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
          {CATEGORY_CHIPS.map((cat) => (
            <Chip
              key={cat.type}
              label={cat.label}
              size="small"
              color={activeCategory === cat.type ? 'primary' : 'default'}
              variant={activeCategory === cat.type ? 'filled' : 'outlined'}
              onClick={() => handleCategoryClick(cat)}
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Stack>
      </Box>

      {locationError && (
        <Alert
          severity="warning"
          action={
            <Chip label="Retry" size="small" onClick={requestLocation} />
          }
          sx={{ mx: 2 }}
        >
          {locationError}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}

      {/* Main content area */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Map view */}
        {showMap && userLocation && (
          <Box sx={{ height: '100%', width: '100%' }}>
            <Map
              defaultCenter={userLocation}
              defaultZoom={13}
              mapId="tidoo-explore-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              {/* User location marker */}
              <AdvancedMarker position={userLocation}>
                <Pin
                  background="#4285f4"
                  glyphColor="#fff"
                  borderColor="#1a73e8"
                  scale={0.8}
                />
              </AdvancedMarker>

              {/* Place markers */}
              {places.map((place) => (
                <AdvancedMarker
                  key={place.id}
                  position={{
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                  }}
                  onClick={() => setSelectedPlace(place)}
                >
                  <Pin
                    background="#ff9800"
                    glyphColor="#fff"
                    borderColor="#f57c00"
                  />
                </AdvancedMarker>
              ))}
            </Map>
          </Box>
        )}

        {/* List view */}
        {!showMap && (
          <Box sx={{ p: 2, overflow: 'auto', height: '100%' }}>
            {places.length === 0 && !loading && (
              <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                Search for places to explore
              </Typography>
            )}
            <Stack spacing={1.5}>
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onClick={() => setSelectedPlace(place)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Toggle map/list FAB */}
        <Fab
          size="small"
          color="primary"
          onClick={() => setShowMap(!showMap)}
          sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 30 }}
        >
          {showMap ? <ListIcon /> : <MapIcon />}
        </Fab>

        {/* Itinerary count badge */}
        {itineraryCount > 0 && (
          <Badge
            badgeContent={itineraryCount}
            color="secondary"
            sx={{ position: 'absolute', bottom: 70, right: 24, zIndex: 30 }}
          >
            <Fab
              size="small"
              color="secondary"
              onClick={() => setShowMap(!showMap)}
              sx={{ visibility: 'hidden' }}
            >
              <MapIcon />
            </Fab>
          </Badge>
        )}
      </Box>

      {/* Place detail drawer */}
      <PlaceDetailDrawer
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />
    </Box>
  );
}
