import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Itinerary, Place } from './types.ts';

interface TidooDB extends DBSchema {
  itineraries: {
    key: string;
    value: Itinerary;
    indexes: { 'by-updated': string };
  };
  cachedPlaces: {
    key: string;
    value: Place & { cachedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<TidooDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TidooDB>('tidoo-db', 1, {
      upgrade(db) {
        const itineraryStore = db.createObjectStore('itineraries', { keyPath: 'id' });
        itineraryStore.createIndex('by-updated', 'updatedAt');
        db.createObjectStore('cachedPlaces', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// Itinerary CRUD
export async function saveItinerary(itinerary: Itinerary): Promise<void> {
  const db = await getDB();
  await db.put('itineraries', { ...itinerary, updatedAt: new Date().toISOString() });
}

export async function getItinerary(id: string): Promise<Itinerary | undefined> {
  const db = await getDB();
  return db.get('itineraries', id);
}

export async function getAllItineraries(): Promise<Itinerary[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('itineraries', 'by-updated');
  return all.reverse(); // most recent first
}

export async function deleteItinerary(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('itineraries', id);
}

// Place cache
export async function cachePlace(place: Place): Promise<void> {
  const db = await getDB();
  await db.put('cachedPlaces', { ...place, cachedAt: Date.now() });
}

export async function getCachedPlace(id: string): Promise<Place | undefined> {
  const db = await getDB();
  const entry = await db.get('cachedPlaces', id);
  if (!entry) return undefined;
  // Return if cached less than 24 hours ago
  if (Date.now() - entry.cachedAt < 24 * 60 * 60 * 1000) {
    return entry;
  }
  return undefined;
}
