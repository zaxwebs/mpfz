export type DepthUnit = "meters" | "fathoms";

export const DEPTH_UNIT_KEY = "pfz-depth-unit";
export const DEPTH_UNIT_CHANGED_EVENT = "pfz-depth-unit-changed";
export const DEFAULT_DEPTH_UNIT: DepthUnit = "meters";

const METERS_PER_FATHOM = 1.8288;

export function normalizeDepthUnit(value: unknown): DepthUnit | null {
  return value === "meters" || value === "fathoms" ? value : null;
}

export function readDepthUnit(): DepthUnit {
  if (typeof window === "undefined") {
    return DEFAULT_DEPTH_UNIT;
  }

  return (
    normalizeDepthUnit(window.localStorage.getItem(DEPTH_UNIT_KEY)) ??
    DEFAULT_DEPTH_UNIT
  );
}

export function writeDepthUnit(unit: DepthUnit) {
  window.localStorage.setItem(DEPTH_UNIT_KEY, unit);
  window.dispatchEvent(
    new CustomEvent(DEPTH_UNIT_CHANGED_EVENT, {
      detail: unit
    })
  );
}

function formatFathomValue(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return (number / METERS_PER_FATHOM).toFixed(1);
}

export function formatDepthRange(depthMeters: string, unit: DepthUnit) {
  if (unit === "meters") {
    return `${depthMeters} m`;
  }

  const values = depthMeters
    .split("-")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return depthMeters;
  }

  return `${values.map(formatFathomValue).join("-")} fathoms`;
}
