import type { PfzLocation } from "../types/pfz";

export const STARRED_SPOTS_KEY = "pfz-starred-spots";

export function getStarredSpotKey(location: Pick<PfzLocation, "coast">) {
  return location.coast.trim().replace(/\s+/g, " ").toLowerCase();
}

export function readStarredSpotKeys() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedStarredKeys = JSON.parse(
      window.localStorage.getItem(STARRED_SPOTS_KEY) ?? "[]"
    );

    return Array.isArray(savedStarredKeys)
      ? savedStarredKeys
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().replace(/\s+/g, " ").toLowerCase())
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function reconcileStarredSpotKeys(
  savedKeys: string[],
  locations: PfzLocation[]
) {
  const keysByLegacyId = new Map(
    locations.map((location) => [location.id, getStarredSpotKey(location)])
  );
  const knownKeys = new Set(locations.map(getStarredSpotKey));
  const reconciledKeys = new Set<string>();

  savedKeys.forEach((savedKey) => {
    const keyFromLegacyId = keysByLegacyId.get(savedKey);
    const normalizedKey = keyFromLegacyId ?? savedKey;

    if (knownKeys.has(normalizedKey)) {
      reconciledKeys.add(normalizedKey);
    }
  });

  return Array.from(reconciledKeys);
}

export function writeStarredSpotKeys(starredKeys: string[]) {
  window.localStorage.setItem(STARRED_SPOTS_KEY, JSON.stringify(starredKeys));
}
