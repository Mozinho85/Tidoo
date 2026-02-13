import type { Place, RouteResponse, TravelMode } from './types.ts';
import { getApiKeys } from './apiKeyStore.ts';

const PLACES_BASE = 'https://places.googleapis.com/v1';
const ROUTES_BASE = 'https://routes.googleapis.com';

function getKey(): string {
  const keys = getApiKeys();
  if (!keys) throw new Error('API keys not configured');
  return keys.googleApiKey;
}

// ─── Places API (New) ────────────────────────────────────────────

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.photos',
  'places.regularOpeningHours',
  'places.googleMapsUri',
].join(',');

const DETAIL_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'primaryType',
  'primaryTypeDisplayName',
  'photos',
  'regularOpeningHours',
  'editorialSummary',
  'nationalPhoneNumber',
  'websiteUri',
  'priceLevel',
  'reviews',
  'googleMapsUri',
].join(',');

export async function searchPlaces(
  query: string,
  location: { lat: number; lng: number },
  options?: {
    type?: string;
    openNow?: boolean;
    minRating?: number;
    maxResultCount?: number;
    rankPreference?: 'RELEVANCE' | 'DISTANCE';
  },
): Promise<Place[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    locationBias: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: 10000,
      },
    },
    maxResultCount: options?.maxResultCount ?? 20,
    rankPreference: options?.rankPreference ?? 'RELEVANCE',
  };

  if (options?.type) {
    body.includedType = options.type;
  }
  if (options?.openNow) {
    body.openNow = true;
  }

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getKey(),
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Places search failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.places ?? []) as Place[];
}

export async function nearbySearch(
  location: { lat: number; lng: number },
  radius: number = 5000,
  types?: string[],
  maxResultCount: number = 20,
): Promise<Place[]> {
  const body: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius,
      },
    },
    maxResultCount,
    rankPreference: 'DISTANCE',
  };

  if (types && types.length > 0) {
    body.includedTypes = types;
  }

  const res = await fetch(`${PLACES_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getKey(),
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Nearby search failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.places ?? []) as Place[];
}

export async function getPlaceDetails(placeId: string): Promise<Place> {
  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': getKey(),
      'X-Goog-FieldMask': DETAIL_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Place details failed: ${res.status}`);
  }

  return (await res.json()) as Place;
}

export function getPlacePhotoUrl(
  photoName: string,
  maxWidth: number = 400,
): string {
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${getKey()}`;
}

// ─── Routes API ──────────────────────────────────────────────────

export async function computeRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  intermediates: Array<{ lat: number; lng: number }>,
  travelMode: TravelMode = 'DRIVE',
  optimizeOrder: boolean = true,
): Promise<RouteResponse> {
  const toWaypoint = (loc: { lat: number; lng: number }) => ({
    location: {
      latLng: { latitude: loc.lat, longitude: loc.lng },
    },
  });

  const body: Record<string, unknown> = {
    origin: toWaypoint(origin),
    destination: toWaypoint(destination),
    intermediates: intermediates.map(toWaypoint),
    travelMode,
    routingPreference: travelMode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
    optimizeWaypointOrder: optimizeOrder,
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  const fieldMask = [
    'routes.legs.distanceMeters',
    'routes.legs.duration',
    'routes.legs.startLocation',
    'routes.legs.endLocation',
    'routes.legs.polyline.encodedPolyline',
    'routes.distanceMeters',
    'routes.duration',
    'routes.polyline.encodedPolyline',
    'routes.optimizedIntermediateWaypointIndex',
  ].join(',');

  const res = await fetch(`${ROUTES_BASE}/directions/v2:computeRoutes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getKey(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Route computation failed: ${res.status}`);
  }

  return (await res.json()) as RouteResponse;
}

// ─── Autocomplete ────────────────────────────────────────────────

export interface AutocompleteSuggestion {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    structuredFormat?: {
      mainText: { text: string };
      secondaryText: { text: string };
    };
  };
}

export async function autocomplete(
  input: string,
  location?: { lat: number; lng: number },
): Promise<AutocompleteSuggestion[]> {
  if (input.length < 2) return [];

  const body: Record<string, unknown> = { input };
  if (location) {
    body.locationBias = {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: 20000,
      },
    };
  }

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.suggestions ?? []) as AutocompleteSuggestion[];
}
