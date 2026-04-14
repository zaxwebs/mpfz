"use client";

import type { CircleMarker as LeafletCircleMarker, LatLngBoundsExpression } from "leaflet";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
  useMap
} from "react-leaflet";
import {
  type CoordinateFormat,
  COORDINATE_FORMAT_CHANGED_EVENT,
  DEFAULT_COORDINATE_FORMAT,
  formatLocationCoordinates,
  getCoordinateFormatLabel,
  normalizeCoordinateFormat,
  readCoordinateFormat
} from "../lib/coordinates";
import {
  type DepthUnit,
  DEFAULT_DEPTH_UNIT,
  DEPTH_UNIT_CHANGED_EVENT,
  formatDepthRange,
  normalizeDepthUnit,
  readDepthUnit
} from "../lib/depthUnits";
import { getDirectionLabel, getDirectionTag } from "../lib/directions";
import {
  getStarredSpotKey,
  readStarredSpotKeys,
  reconcileStarredSpotKeys,
  writeStarredSpotKeys
} from "../lib/starredSpots";
import type { PfzApiResponse, PfzLocation } from "../types/pfz";
import StarIcon from "./StarIcon";

const DEFAULT_CENTER: [number, number] = [17.6, 72.9];
const FOCUSED_LOCATION_ZOOM = 12;
const USER_LOCATION_ZOOM = 13;

type UserLocation = {
  accuracy: number;
  latitude: number;
  longitude: number;
};

function getSpotCopyText(
  location: PfzLocation,
  coordinateFormat: CoordinateFormat,
  depthUnit: DepthUnit
) {
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
    `Water depth: ${formatDepthRange(location.depthMtr, depthUnit)}`
  ].join("\n");
}

function FitToLocations({ locations }: { locations: PfzLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      return;
    }

    const bounds = locations.map((location) => [
      location.latitude,
      location.longitude
    ]) as LatLngBoundsExpression;

    map.fitBounds(bounds, {
      animate: false,
      padding: [36, 36],
      maxZoom: 10
    });
  }, [locations, map]);

  return null;
}

function FlyToSelected({
  focusRequest,
  location,
  markerRefs,
  suppressFocus
}: {
  focusRequest: number;
  location: PfzLocation | null;
  markerRefs: React.MutableRefObject<Record<string, LeafletCircleMarker | null>>;
  suppressFocus: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (suppressFocus || !location || focusRequest === 0) {
      return;
    }

    map.setView([location.latitude, location.longitude], FOCUSED_LOCATION_ZOOM, {
      animate: false
    });

    const openSelectedPopup = () => {
      markerRefs.current[location.id]?.openPopup();
    };

    openSelectedPopup();
    const frame = window.requestAnimationFrame(openSelectedPopup);

    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest, location, map, markerRefs, suppressFocus]);

  return null;
}

function TrackMapZoom({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
    }
  });

  useEffect(() => {
    const zoom = map.getZoom();
    onZoomChange(zoom);
  }, [map, onZoomChange]);

  return null;
}

function UserLocationMarker({ location }: { location: UserLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.stop();
    map.closePopup();
    map.setView([location.latitude, location.longitude], USER_LOCATION_ZOOM, {
      animate: false
    });
  }, [location, map]);

  if (!location) {
    return null;
  }

  return (
    <CircleMarker
      center={[location.latitude, location.longitude]}
      radius={9}
      pathOptions={{
        color: "#ffffff",
        fillColor: "#1a73e8",
        fillOpacity: 0.95,
        weight: 3
      }}
    >
      <Popup>
        <div className="popupContent">
          <strong>Your location</strong>
          <span>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </span>
          <span>Accuracy: about {Math.round(location.accuracy)} m</span>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function PfzMap() {
  const searchParams = useSearchParams();
  const spotParam = searchParams.get("spot");
  const [data, setData] = useState<PfzApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [showSidebarStarredOnly, setShowSidebarStarredOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFocusRequest, setSelectedFocusRequest] = useState(0);
  const [mapZoom, setMapZoom] = useState(7);
  const [starredKeys, setStarredKeys] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>(
    DEFAULT_COORDINATE_FORMAT
  );
  const [depthUnit, setDepthUnit] = useState<DepthUnit>(DEFAULT_DEPTH_UNIT);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const markerRefs = useRef<Record<string, LeafletCircleMarker | null>>({});
  const previousStarredFilterRef = useRef(showSidebarStarredOnly);
  const isUserLocationFocusRef = useRef(false);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pfz/maharashtra", {
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "PFZ data could not be loaded.");
      }

      setData(payload);
      const savedStarredKeys = reconcileStarredSpotKeys(
        readStarredSpotKeys(),
        payload.locations
      );
      const firstStarredLocation = payload.locations.find((location: PfzLocation) =>
        savedStarredKeys.includes(getStarredSpotKey(location))
      );

      writeStarredSpotKeys(savedStarredKeys);
      setStarredKeys(savedStarredKeys);
      if (spotParam && payload.locations.some((location: PfzLocation) => location.id === spotParam)) {
        setSelectedId(spotParam);
        setSelectedFocusRequest((request) => request + 1);
      } else if (firstStarredLocation) {
        setSelectedId(firstStarredLocation.id);
        setSelectedFocusRequest((request) => request + 1);
      } else {
        setSelectedId(payload.locations[0]?.id ?? null);
        setSelectedFocusRequest((request) => request + 1);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "PFZ data could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
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
    function updateDepthUnit(event?: Event) {
      const nextUnit =
        event instanceof CustomEvent
          ? normalizeDepthUnit(event.detail)
          : readDepthUnit();

      setDepthUnit(nextUnit ?? readDepthUnit());
    }

    updateDepthUnit();
    window.addEventListener(DEPTH_UNIT_CHANGED_EVENT, updateDepthUnit);
    window.addEventListener("storage", updateDepthUnit);

    return () => {
      window.removeEventListener(DEPTH_UNIT_CHANGED_EVENT, updateDepthUnit);
      window.removeEventListener("storage", updateDepthUnit);
    };
  }, []);

  const allLocations = useMemo(() => {
    return data?.locations ?? [];
  }, [data]);

  const starredSet = useMemo(() => new Set(starredKeys), [starredKeys]);
  const hasStarredSpots = starredKeys.length > 0;

  const filteredLocations = useMemo(() => {
    if (!showSidebarStarredOnly) {
      return allLocations;
    }

    return allLocations.filter((location) =>
      starredSet.has(getStarredSpotKey(location))
    );
  }, [allLocations, showSidebarStarredOnly, starredSet]);

  const sidebarLocations = useMemo(() => {
    const normalizedQuery = sidebarQuery.trim().toLowerCase();
    let locations = filteredLocations;

    if (!normalizedQuery) {
      return locations;
    }

    return locations.filter((location) =>
      location.coast.toLowerCase().includes(normalizedQuery)
    );
  }, [filteredLocations, sidebarQuery]);

  const selectedLocation =
    (data?.locations ?? []).find((location) => location.id === selectedId) ?? null;
  const selectedFilteredIndex = filteredLocations.findIndex(
    (location) => location.id === selectedId
  );

  useEffect(() => {
    const didStarredFilterChange =
      previousStarredFilterRef.current !== showSidebarStarredOnly;

    previousStarredFilterRef.current = showSidebarStarredOnly;

    if (!didStarredFilterChange) {
      return;
    }

    if (filteredLocations.length === 0) {
      setSelectedId(null);
      setSelectedFocusRequest(0);
      return;
    }

    setSelectedId(filteredLocations[0].id);
    setSelectedFocusRequest((request) => request + 1);
  }, [filteredLocations, showSidebarStarredOnly]);

  useEffect(() => {
    if (
      filteredLocations.length === 0 ||
      (selectedId &&
        filteredLocations.some((location) => location.id === selectedId))
    ) {
      return;
    }

    setSelectedId(filteredLocations[0].id);
    setSelectedFocusRequest((request) => request + 1);
  }, [filteredLocations, selectedId]);

  function moveSelection(direction: -1 | 1) {
    if (filteredLocations.length === 0) {
      return;
    }

    const currentIndex = selectedFilteredIndex >= 0 ? selectedFilteredIndex : 0;
    const nextIndex =
      (currentIndex + direction + filteredLocations.length) % filteredLocations.length;

    focusPlace(filteredLocations[nextIndex].id);
  }

  function focusPlace(locationId: string) {
    isUserLocationFocusRef.current = false;
    setUserLocation(null);
    setSelectedId(locationId);
    setSelectedFocusRequest((request) => request + 1);
  }

  async function copySpot(location: PfzLocation) {
    try {
      await navigator.clipboard.writeText(
        getSpotCopyText(location, coordinateFormat, depthUnit)
      );
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

  function toggleSidebarStarredFilter() {
    if (!hasStarredSpots && !showSidebarStarredOnly) {
      return;
    }

    setShowSidebarStarredOnly((value) => !value);
  }

  function requestUserLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    isUserLocationFocusRef.current = true;
    setUserLocation(null);
    setSelectedId(null);
    setSelectedFocusRequest(0);
    Object.values(markerRefs.current).forEach((marker) => marker?.closePopup());

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          accuracy: position.coords.accuracy,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsLocating(false);
      },
      (positionError) => {
        isUserLocationFocusRef.current = false;
        setLocationError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "Location permission was blocked."
            : "Could not get your location."
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000
      }
    );
  }

  return (
    <main className="shell">
      <section className="mapStage" aria-label="Leaflet map">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={7}
          minZoom={6}
          scrollWheelZoom
          className="leafletMap"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | PFZ data: <a href="https://incois.gov.in/" target="_blank" rel="noreferrer">INCOIS</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToLocations locations={filteredLocations} />
          <FlyToSelected
            focusRequest={selectedFocusRequest}
            location={selectedLocation}
            markerRefs={markerRefs}
            suppressFocus={userLocation !== null || isUserLocationFocusRef.current}
          />
          <TrackMapZoom onZoomChange={setMapZoom} />
          <UserLocationMarker location={userLocation} />

          {filteredLocations.map((location) => {
            const isSelected = location.id === selectedId;
            const isStarred = starredSet.has(getStarredSpotKey(location));
            const markerRadius =
              mapZoom <= 11 ? (isSelected ? 8 : 5) : isSelected ? 12 : 8;

            return (
              <CircleMarker
                key={location.id}
                center={[location.latitude, location.longitude]}
                radius={markerRadius}
                pathOptions={{
                  color: isSelected ? "#e0004d" : "#008a7e",
                  fillColor: isSelected ? "#ff385c" : "#00a699",
                  fillOpacity: isSelected ? 0.95 : 0.72,
                  weight: isSelected ? 3 : 2
                }}
                ref={(marker) => {
                  markerRefs.current[location.id] = marker;
                }}
                eventHandlers={{
                  click: () => focusPlace(location.id)
                }}
              >
                <Popup>
                  <div className="popupContent">
                    <strong>{location.coast}</strong>
                    <span>
                      {getDirectionTag(location.direction)}
                      {location.bearingDeg !== null
                        ? `, ${location.bearingDeg} deg`
                        : ""}
                    </span>
                    <span>{location.distanceKm} km from coast</span>
                    <span>{formatDepthRange(location.depthMtr, depthUnit)} deep</span>
                    <span>
                      {formatLocationCoordinates(location, coordinateFormat)}
                    </span>
                    <div className="popupActions">
                      <button
                        className="popupActionButton popupCopyButton"
                        onClick={() => copySpot(location)}
                        type="button"
                      >
                        {copiedId === location.id ? "Copied" : "Copy"}
                      </button>
                      <button
                        aria-label={
                          isStarred
                            ? `Unstar ${location.coast}`
                            : `Star ${location.coast}`
                        }
                        aria-pressed={isStarred}
                        className={`popupActionButton popupStarButton ${
                          isStarred ? "active" : ""
                        }`}
                        onClick={() => toggleStarred(location)}
                        type="button"
                      >
                        {isStarred ? "Starred" : "Star"}
                      </button>
                    </div>
                  </div>
                </Popup>
                {mapZoom >= FOCUSED_LOCATION_ZOOM ? (
                  <Tooltip
                    className="markerNameTooltip"
                    direction="right"
                    offset={[10, 0]}
                    opacity={1}
                    permanent
                  >
                    {location.coast}
                  </Tooltip>
                ) : null}
              </CircleMarker>
            );
          })}
        </MapContainer>

        {error || locationError ? (
          <div className="mapAlerts" aria-live="polite">
            {error ? <p className="errorText">{error}</p> : null}
            {locationError ? <p className="errorText">{locationError}</p> : null}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mapStatus" role="status">
            <span className="loadingDot" />
            Loading fishing spots
          </div>
        ) : null}

        <div className="mapStarredFilter">
          <button
            aria-label={
              showSidebarStarredOnly
                ? "Show all spots"
                : `Show starred spots, ${starredKeys.length} saved`
            }
            aria-pressed={showSidebarStarredOnly}
            className={`mapStarredFilterButton starredFilter ${
              showSidebarStarredOnly ? "active" : ""
            }`}
            disabled={!hasStarredSpots && !showSidebarStarredOnly}
            onClick={toggleSidebarStarredFilter}
            title={
              showSidebarStarredOnly
                ? "Show all spots"
                : hasStarredSpots
                  ? "Show starred spots"
                  : "Star a spot to use this filter"
            }
            type="button"
          >
            {showSidebarStarredOnly ? "Starred" : "Stars"}
            <strong>{starredKeys.length}</strong>
          </button>
        </div>

        <button
          aria-label={isLocating ? "Finding your location" : "Show my location"}
          className={`locateButton ${isLocating ? "locating" : ""}`}
          disabled={isLocating}
          onClick={requestUserLocation}
          title={isLocating ? "Finding your location" : "Show my location"}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="locateIcon"
            fill="currentColor"
            focusable="false"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M8.5.5a.5.5 0 0 0-1 0v.518A7 7 0 0 0 1.018 7.5H.5a.5.5 0 0 0 0 1h.518A7 7 0 0 0 7.5 14.982v.518a.5.5 0 0 0 1 0v-.518A7 7 0 0 0 14.982 8.5h.518a.5.5 0 0 0 0-1h-.518A7 7 0 0 0 8.5 1.018zm-6.48 7A6 6 0 0 1 7.5 2.02v.48a.5.5 0 0 0 1 0v-.48a6 6 0 0 1 5.48 5.48h-.48a.5.5 0 0 0 0 1h.48a6 6 0 0 1-5.48 5.48v-.48a.5.5 0 0 0-1 0v.48A6 6 0 0 1 2.02 8.5h.48a.5.5 0 0 0 0-1zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
          </svg>
        </button>

        <div className="mapNavControls" aria-label="Move between places">
          <button
            type="button"
            onClick={() => moveSelection(-1)}
            disabled={filteredLocations.length === 0}
          >
            Previous
          </button>
          <span>
            {selectedFilteredIndex >= 0 ? selectedFilteredIndex + 1 : 0} /{" "}
            {filteredLocations.length}
          </span>
          <button
            type="button"
            onClick={() => moveSelection(1)}
            disabled={filteredLocations.length === 0}
          >
            Next
          </button>
        </div>
      </section>

      <aside className="mapSpotsPanel" aria-label="PFZ spots">
        <div className="mapSpotsHeader">
          <div>
            <p className="sectionEyebrow">Map spots</p>
            <h2>Fishing locations</h2>
          </div>
          <span>{filteredLocations.length}</span>
        </div>

        <div className="mapSpotsTools">
          <label className="mapSpotsSearch">
            <input
              className="searchInput"
              disabled={isLoading}
              onChange={(event) => setSidebarQuery(event.target.value)}
              placeholder="Type to search..."
              value={sidebarQuery}
            />
          </label>
        </div>

        <div className="mapSpotsList" aria-live="polite">
          {isLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <article
                  aria-hidden="true"
                  className="mapSpotItem mapSpotItemSkeleton"
                  key={index}
                >
                  <div>
                    <span className="skeletonLine title" />
                    <span className="skeletonLine medium" />
                    <span className="skeletonLine short" />
                  </div>
                  <span className="skeletonStar" />
                </article>
              ))
            : null}

          {!isLoading && sidebarLocations.map((location) => {
            const isStarred = starredSet.has(getStarredSpotKey(location));

            return (
              <article
                className={`mapSpotItem ${
                  location.id === selectedId ? "selected" : ""
                } ${isStarred ? "starred" : ""}`}
                key={location.id}
                onClick={() => focusPlace(location.id)}
              >
                <button
                  className="mapSpotSelect"
                  onClick={(event) => {
                    event.stopPropagation();
                    focusPlace(location.id);
                  }}
                  type="button"
                >
                  <span>
                    <span className="spotTitleRow">
                      <strong>{location.coast}</strong>
                      <span className="bearingPill">
                        {getDirectionTag(location.direction)}
                      </span>
                    </span>
                    <small className="locationCoords">
                      {formatLocationCoordinates(location, coordinateFormat)}
                    </small>
                    <small>
                      {location.distanceKm} km from coast,{" "}
                      {formatDepthRange(location.depthMtr, depthUnit)} deep
                    </small>
                  </span>
                </button>
                <button
                  aria-label={
                    isStarred ? `Unstar ${location.coast}` : `Star ${location.coast}`
                  }
                  aria-pressed={isStarred}
                  className={`starButton ${isStarred ? "active" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleStarred(location);
                  }}
                  title={isStarred ? "Unstar spot" : "Star spot"}
                  type="button"
                >
                  <StarIcon />
                </button>
              </article>
            );
          })}

          {!isLoading && sidebarLocations.length === 0 ? (
            <div className="emptyState">
              <p>
                {showSidebarStarredOnly
                  ? hasStarredSpots
                    ? "No starred spots match this search."
                    : "No starred spots yet."
                  : "No spot found. Try a shorter search."}
              </p>
              {showSidebarStarredOnly ? (
                <button
                  type="button"
                  onClick={() => setShowSidebarStarredOnly(false)}
                >
                  Show all spots
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </main>
  );
}
