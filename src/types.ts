export interface PlaceLocation {
  latitude: number;
  longitude: number;
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string;
  }>;
}

export interface PlaceOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

export interface PlaceReview {
  authorAttribution: {
    displayName: string;
    uri: string;
    photoUri: string;
  };
  rating: number;
  text: { text: string; languageCode: string };
  relativePublishTimeDescription: string;
}

export interface Place {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: PlaceLocation;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  photos?: PlacePhoto[];
  regularOpeningHours?: PlaceOpeningHours;
  editorialSummary?: { text: string };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  priceLevel?: string;
  reviews?: PlaceReview[];
  googleMapsUri?: string;
}

export interface ItineraryPlace {
  place: Place;
  order: number;
  notes?: string;
}

export interface Itinerary {
  id: string;
  name: string;
  places: ItineraryPlace[];
  travelMode: TravelMode;
  createdAt: string;
  updatedAt: string;
  totalDuration?: string;
  totalDistance?: string;
  routeLegs?: RouteLeg[];
}

export type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';

export interface RouteLeg {
  distanceMeters: number;
  duration: string;
  startLocation: PlaceLocation;
  endLocation: PlaceLocation;
  polyline?: { encodedPolyline: string };
}

export interface RouteResponse {
  routes: Array<{
    legs: RouteLeg[];
    distanceMeters: number;
    duration: string;
    polyline?: { encodedPolyline: string };
    optimizedIntermediateWaypointIndex?: number[];
  }>;
}

export interface ApiKeys {
  googleApiKey: string;
}

export interface SearchFilters {
  query: string;
  type: string;
  openNow: boolean;
  minRating: number;
  maxDistance: number; // meters
  rankBy: 'RELEVANCE' | 'DISTANCE';
}
