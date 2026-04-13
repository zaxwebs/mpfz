"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type CoordinateFormat,
  COORDINATE_FORMAT_CHANGED_EVENT,
  DEFAULT_COORDINATE_FORMAT,
  formatLocationCoordinates,
  getCoordinateFormatLabel,
  normalizeCoordinateFormat,
  readCoordinateFormat
} from "../lib/coordinates";
import { getDirectionLabel, getDirectionTag } from "../lib/directions";
import {
  getStarredSpotKey,
  readStarredSpotKeys,
  reconcileStarredSpotKeys,
  writeStarredSpotKeys
} from "../lib/starredSpots";
import StarIcon from "./StarIcon";
import type { PfzApiResponse, PfzLocation } from "../types/pfz";

function getSpotCopyText(location: PfzLocation, coordinateFormat: CoordinateFormat) {
  return [
    location.coast,
    `Location (${getCoordinateFormatLabel(coordinateFormat)}): ${formatLocationCoordinates(
      location,
      coordinateFormat
    )}`,
    `Coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
    `Direction: ${getDirectionLabel(location.direction)}${
      location.bearingDeg !== null ? `, ${location.bearingDeg} degrees` : ""
    }`,
    `Distance from coast: ${location.distanceKm} km`,
    `Water depth: ${location.depthMtr} m`
  ].join("\n");
}

export default function SpotsList() {
  const [data, setData] = useState<PfzApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [starredKeys, setStarredKeys] = useState<string[]>([]);
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>(
    DEFAULT_COORDINATE_FORMAT
  );

  useEffect(() => {
    async function loadSpots() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/pfz/maharashtra", {
          cache: "no-store"
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "PFZ spots could not be loaded.");
        }

        setData(payload);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "PFZ spots could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSpots();
  }, []);

  useEffect(() => {
    setStarredKeys(readStarredSpotKeys());
  }, []);

  useEffect(() => {
    function updateCoordinateFormat(event?: Event) {
      const nextFormat =
        event instanceof CustomEvent
          ? normalizeCoordinateFormat(event.detail)
          : readCoordinateFormat();

      setCoordinateFormat(nextFormat ?? readCoordinateFormat());
    }

    updateCoordinateFormat();
    window.addEventListener(COORDINATE_FORMAT_CHANGED_EVENT, updateCoordinateFormat);
    window.addEventListener("storage", updateCoordinateFormat);

    return () => {
      window.removeEventListener(
        COORDINATE_FORMAT_CHANGED_EVENT,
        updateCoordinateFormat
      );
      window.removeEventListener("storage", updateCoordinateFormat);
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    setStarredKeys((currentStarredKeys) => {
      const nextStarredKeys = reconcileStarredSpotKeys(
        currentStarredKeys,
        data.locations
      );

      if (nextStarredKeys.join("|") !== currentStarredKeys.join("|")) {
        writeStarredSpotKeys(nextStarredKeys);
      }

      return nextStarredKeys;
    });
  }, [data]);

  const starredSet = useMemo(() => new Set(starredKeys), [starredKeys]);
  const hasStarredSpots = starredKeys.length > 0;

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let locations = data?.locations ?? [];

    if (showStarredOnly) {
      locations = locations.filter((location) =>
        starredSet.has(getStarredSpotKey(location))
      );
    }

    if (!normalizedQuery) {
      return locations;
    }

    return locations.filter((location) =>
      location.coast.toLowerCase().includes(normalizedQuery)
    );
  }, [data, query, showStarredOnly, starredSet]);

  async function copySpot(location: PfzLocation) {
    try {
      await navigator.clipboard.writeText(getSpotCopyText(location, coordinateFormat));
      setCopiedId(location.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError("Could not copy this spot.");
    }
  }

  function toggleStarred(location: PfzLocation) {
    const locationKey = getStarredSpotKey(location);

    setStarredKeys((currentStarredKeys) => {
      const nextStarredKeys = currentStarredKeys.includes(locationKey)
        ? currentStarredKeys.filter((key) => key !== locationKey)
        : [...currentStarredKeys, locationKey];

      writeStarredSpotKeys(nextStarredKeys);
      return nextStarredKeys;
    });
  }

  function toggleStarredFilter() {
    if (!hasStarredSpots && !showStarredOnly) {
      return;
    }

    setShowStarredOnly((value) => !value);
  }

  return (
    <main className="spotsPage">
      <header className="spotsHeader">
        <div>
          <p className="sectionEyebrow">PFZ spots</p>
          <h1>Fishing locations</h1>
        </div>
        <div className="spotsTools">
          <label className="spotsSearch">
            <input
              className="searchInput"
              disabled={isLoading}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to search..."
              value={query}
            />
          </label>
          <button
            aria-label={
              showStarredOnly
                ? "Show all spots"
                : `Show starred spots, ${starredKeys.length} saved`
            }
            aria-pressed={showStarredOnly}
            className={`starredFilter ${showStarredOnly ? "active" : ""}`}
            disabled={!hasStarredSpots && !showStarredOnly}
            onClick={toggleStarredFilter}
            title={
              showStarredOnly
                ? "Show all spots"
                : hasStarredSpots
                  ? "Show starred spots"
                  : "Star a spot to use this filter"
            }
            type="button"
          >
            {showStarredOnly ? "Starred" : "Stars"}
            <strong>{starredKeys.length}</strong>
          </button>
        </div>
      </header>

      {error ? <p className="errorText">{error}</p> : null}

      <div className="spotsList" aria-live="polite">
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => (
              <article
                aria-hidden="true"
                className="spotCard spotCardSkeleton"
                key={index}
              >
                <div className="spotCardMain">
                  <span className="skeletonLine title" />
                  <span className="skeletonLine medium" />
                  <span className="skeletonLine short" />
                </div>
                <span className="skeletonStar" />
                <span className="skeletonPill" />
                <div className="spotActions">
                  <span className="skeletonButton" />
                  <span className="skeletonButton primary" />
                </div>
              </article>
            ))
          : null}

        {!isLoading && filteredLocations.map((location) => {
          const isStarred = starredSet.has(getStarredSpotKey(location));

          return (
          <article className={`spotCard ${isStarred ? "starred" : ""}`} key={location.id}>
            <Link
              aria-label={`View ${location.coast} on map`}
              className="spotCardOverlayLink"
              href={`/map?spot=${encodeURIComponent(location.id)}`}
            />
            <div className="spotCardMain">
              <div className="spotTitleRow">
                <strong>{location.coast}</strong>
                <span className="bearingPill">
                  {getDirectionTag(location.direction)}
                </span>
              </div>
              <span className="spotCoords">
                {formatLocationCoordinates(location, coordinateFormat)}
              </span>
              <span className="spotMeta">
                {location.distanceKm} km from coast, {location.depthMtr} m deep
              </span>
            </div>
            <button
              aria-label={isStarred ? `Unstar ${location.coast}` : `Star ${location.coast}`}
              aria-pressed={isStarred}
              className={`starButton ${isStarred ? "active" : ""}`}
              onClick={() => toggleStarred(location)}
            title={isStarred ? "Unstar spot" : "Star spot"}
            type="button"
          >
              <StarIcon />
            </button>
            <div className="spotActions">
              <button type="button" onClick={() => copySpot(location)}>
                {copiedId === location.id ? "Copied" : "Copy"}
              </button>
              <Link href={`/map?spot=${encodeURIComponent(location.id)}`}>
                View on map
              </Link>
            </div>
          </article>
          );
        })}

        {!isLoading && data && filteredLocations.length === 0 ? (
          <div className="emptyState">
            <p>
              {showStarredOnly
                ? hasStarredSpots
                  ? "No starred spots match this search."
                  : "No starred spots yet."
                : "No spot found. Try a shorter search."}
            </p>
            {showStarredOnly ? (
              <button type="button" onClick={() => setShowStarredOnly(false)}>
                Show all spots
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
