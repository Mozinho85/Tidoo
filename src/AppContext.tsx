import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Place, Itinerary, ItineraryPlace, TravelMode } from './types.ts';
import { saveItinerary, getAllItineraries, deleteItinerary as dbDelete } from './db.ts';

interface AppState {
  // Location
  userLocation: { lat: number; lng: number } | null;
  locationError: string | null;
  requestLocation: () => void;

  // Active itinerary
  activeItinerary: Itinerary;
  addPlace: (place: Place) => void;
  removePlace: (placeId: string) => void;
  reorderPlaces: (places: ItineraryPlace[]) => void;
  setTravelMode: (mode: TravelMode) => void;
  clearItinerary: () => void;
  isPlaceInItinerary: (placeId: string) => boolean;

  // Saved itineraries
  savedItineraries: Itinerary[];
  saveCurrentItinerary: (name: string) => Promise<void>;
  loadItinerary: (itinerary: Itinerary) => void;
  deleteSavedItinerary: (id: string) => Promise<void>;
  refreshSavedItineraries: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

function createEmptyItinerary(): Itinerary {
  return {
    id: uuidv4(),
    name: 'New Itinerary',
    places: [],
    travelMode: 'DRIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeItinerary, setActiveItinerary] = useState<Itinerary>(createEmptyItinerary);
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Load saved itineraries
  const refreshSavedItineraries = useCallback(async () => {
    const all = await getAllItineraries();
    setSavedItineraries(all);
  }, []);

  useEffect(() => {
    refreshSavedItineraries();
  }, [refreshSavedItineraries]);

  const addPlace = useCallback((place: Place) => {
    setActiveItinerary((prev) => {
      if (prev.places.some((p) => p.place.id === place.id)) return prev;
      return {
        ...prev,
        places: [...prev.places, { place, order: prev.places.length }],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removePlace = useCallback((placeId: string) => {
    setActiveItinerary((prev) => ({
      ...prev,
      places: prev.places
        .filter((p) => p.place.id !== placeId)
        .map((p, i) => ({ ...p, order: i })),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const reorderPlaces = useCallback((places: ItineraryPlace[]) => {
    setActiveItinerary((prev) => ({
      ...prev,
      places: places.map((p, i) => ({ ...p, order: i })),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const setTravelMode = useCallback((mode: TravelMode) => {
    setActiveItinerary((prev) => ({ ...prev, travelMode: mode, updatedAt: new Date().toISOString() }));
  }, []);

  const clearItinerary = useCallback(() => {
    setActiveItinerary(createEmptyItinerary());
  }, []);

  const isPlaceInItinerary = useCallback(
    (placeId: string) => activeItinerary.places.some((p) => p.place.id === placeId),
    [activeItinerary.places],
  );

  const saveCurrentItinerary = useCallback(
    async (name: string) => {
      const toSave = { ...activeItinerary, name };
      await saveItinerary(toSave);
      await refreshSavedItineraries();
    },
    [activeItinerary, refreshSavedItineraries],
  );

  const loadItinerary = useCallback((itinerary: Itinerary) => {
    setActiveItinerary({ ...itinerary });
  }, []);

  const deleteSavedItinerary = useCallback(
    async (id: string) => {
      await dbDelete(id);
      await refreshSavedItineraries();
    },
    [refreshSavedItineraries],
  );

  return (
    <AppContext.Provider
      value={{
        userLocation,
        locationError,
        requestLocation,
        activeItinerary,
        addPlace,
        removePlace,
        reorderPlaces,
        setTravelMode,
        clearItinerary,
        isPlaceInItinerary,
        savedItineraries,
        saveCurrentItinerary,
        loadItinerary,
        deleteSavedItinerary,
        refreshSavedItineraries,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
