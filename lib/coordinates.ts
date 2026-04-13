import type { PfzLocation } from "../types/pfz";

export type CoordinateFormat = "dms" | "ddm";

export const COORDINATE_FORMAT_KEY = "pfz-coordinate-format";
export const COORDINATE_FORMAT_CHANGED_EVENT = "pfz-coordinate-format-changed";
export const DEFAULT_COORDINATE_FORMAT: CoordinateFormat = "dms";

export function normalizeCoordinateFormat(
  value: unknown
): CoordinateFormat | null {
  return value === "dms" || value === "ddm" ? value : null;
}

export function readCoordinateFormat(): CoordinateFormat {
  if (typeof window === "undefined") {
    return DEFAULT_COORDINATE_FORMAT;
  }

  return (
    normalizeCoordinateFormat(window.localStorage.getItem(COORDINATE_FORMAT_KEY)) ??
    DEFAULT_COORDINATE_FORMAT
  );
}

export function writeCoordinateFormat(format: CoordinateFormat) {
  window.localStorage.setItem(COORDINATE_FORMAT_KEY, format);
  window.dispatchEvent(
    new CustomEvent(COORDINATE_FORMAT_CHANGED_EVENT, {
      detail: format
    })
  );
}

function formatDdmCoordinate(value: number, positiveSuffix: string, negativeSuffix: string) {
  const absoluteValue = Math.abs(value);
  const degrees = Math.floor(absoluteValue);
  const minutes = (absoluteValue - degrees) * 60;
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;

  return `${degrees} ${minutes.toFixed(3)} ${suffix}`;
}

export function formatLocationCoordinates(
  location: PfzLocation,
  format: CoordinateFormat
) {
  if (format === "ddm") {
    return `${formatDdmCoordinate(location.latitude, "N", "S")}, ${formatDdmCoordinate(
      location.longitude,
      "E",
      "W"
    )}`;
  }

  return `${location.latitudeDms}, ${location.longitudeDms}`;
}

export function getCoordinateFormatLabel(format: CoordinateFormat) {
  return format === "ddm" ? "DDM" : "DMS";
}
