import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { PfzApiResponse, PfzLocation } from "../types/pfz";

const USER_AGENT =
  "Mozilla/5.0 (compatible; pfz-map/0.1; +https://incois.gov.in/)";

const HOME_URL =
  "https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en";
const TEXT_DATA_BASE = "https://incois.gov.in/MarineFisheries/TextData";
const DOWNLOAD_URL =
  "https://incois.gov.in/MarineFisheries/download.action?documentType=xls&distanceformat=km&depthformat=metre&latlongformat=dms";
const MAHARASHTRA_SECTOR_ID = "SEC002";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const MAHARASHTRA_CACHE_PATH = path.join(CACHE_DIR, "pfz-maharashtra.json");
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const REFRESH_HOUR_IST = 17;
const REFRESH_GRACE_MINUTES = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

let maharashtraRefreshRequest: Promise<PfzApiResponse> | null = null;

type FetchResult = {
  buffer: Buffer;
  source: string;
};

function getSessionId(html: string, setCookie: string | null) {
  const fromLink = html.match(
    /TextData;jsessionid=([^?]+)\?secid=SEC002/i
  )?.[1];
  const fromCookie = setCookie?.match(/JSESSIONID=([^;]+)/i)?.[1];

  return fromLink ?? fromCookie ?? null;
}

function getDailyRefreshTime(now: Date) {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const refreshTimeAsIst = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
    REFRESH_HOUR_IST,
    REFRESH_GRACE_MINUTES
  );

  return new Date(refreshTimeAsIst - IST_OFFSET_MS);
}

function isFreshForCurrentAdvisory(data: PfzApiResponse, now = new Date()) {
  const fetchedAt = new Date(data.fetchedAt);

  if (Number.isNaN(fetchedAt.getTime())) {
    return false;
  }

  const todayRefreshTime = getDailyRefreshTime(now);
  const activeRefreshTime =
    now.getTime() >= todayRefreshTime.getTime()
      ? todayRefreshTime
      : new Date(todayRefreshTime.getTime() - DAY_MS);

  return fetchedAt.getTime() >= activeRefreshTime.getTime();
}

function isPfzApiResponse(value: unknown): value is PfzApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "fetchedAt" in value &&
    "locations" in value &&
    Array.isArray((value as PfzApiResponse).locations)
  );
}

async function readCachedMaharashtraPfz() {
  try {
    const cached = JSON.parse(await readFile(MAHARASHTRA_CACHE_PATH, "utf8"));
    return isPfzApiResponse(cached) ? cached : null;
  } catch {
    return null;
  }
}

async function writeCachedMaharashtraPfz(data: PfzApiResponse) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(MAHARASHTRA_CACHE_PATH, JSON.stringify(data, null, 2));
}

function getCookieHeader(sessionId: string) {
  return `JSESSIONID=${sessionId}`;
}

async function checkedFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`INCOIS request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

async function fetchMaharashtraWorkbook(): Promise<FetchResult> {
  const homeResponse = await checkedFetch(HOME_URL);
  const homeHtml = await homeResponse.text();
  const sessionId = getSessionId(homeHtml, homeResponse.headers.get("set-cookie"));

  if (!sessionId) {
    throw new Error("Could not find an INCOIS session for the Maharashtra PFZ export.");
  }

  const textDataUrl = `${TEXT_DATA_BASE};jsessionid=${sessionId}?secid=${MAHARASHTRA_SECTOR_ID}`;
  const cookie = getCookieHeader(sessionId);

  await checkedFetch(textDataUrl, {
    headers: {
      Cookie: cookie,
      Referer: HOME_URL
    }
  });

  const downloadResponse = await checkedFetch(DOWNLOAD_URL, {
    headers: {
      Cookie: cookie,
      Referer: textDataUrl
    }
  });

  return {
    buffer: Buffer.from(await downloadResponse.arrayBuffer()),
    source: HOME_URL
  };
}

function normalizeCell(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function dmsToDecimal(value: string) {
  const match = value.match(
    /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*([NSEW])$/i
  );

  if (match) {
    const degrees = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const hemisphere = match[4].toUpperCase();
    const decimal = degrees + minutes / 60 + seconds / 3600;

    return hemisphere === "S" || hemisphere === "W" ? -decimal : decimal;
  }

  const decimal = Number(value);
  return Number.isFinite(decimal) ? decimal : null;
}

function parseBearing(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function makeId(location: Pick<PfzLocation, "coast" | "latitude" | "longitude">) {
  return `${location.coast}-${location.latitude.toFixed(5)}-${location.longitude.toFixed(
    5
  )}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getValidity(rows: string[][]) {
  return (
    rows
      .flat()
      .map((cell) => cell.match(/forecast validity.*$/i)?.[0] ?? "")
      .find(Boolean) ?? null
  );
}

function getSector(rows: string[][]) {
  const firstValue = rows.flat().find(Boolean);
  return firstValue?.split(/\s+forecast validity/i)[0]?.trim() || "MAHARASHTRA";
}

function parseWorkbook(buffer: Buffer, source: string): PfzApiResponse {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    throw new Error("The INCOIS workbook did not include a readable sheet.");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: ""
  });

  const normalizedRows = rows.map((row) => row.map(normalizeCell));
  const headerIndex = normalizedRows.findIndex((row) =>
    row.some((cell) => cell.toLowerCase() === "from the coast of")
  );

  if (headerIndex === -1) {
    throw new Error("The INCOIS workbook did not contain a PFZ forecast table.");
  }

  const locations: PfzLocation[] = [];

  for (const row of normalizedRows.slice(headerIndex + 1)) {
    const [coast, direction, bearing, distanceKm, depthMtr, latitudeDms, longitudeDms] =
      row;

    if (!coast || !latitudeDms || !longitudeDms) {
      continue;
    }

    const latitude = dmsToDecimal(latitudeDms);
    const longitude = dmsToDecimal(longitudeDms);

    if (latitude === null || longitude === null) {
      continue;
    }

    const location = {
      id: "",
      coast,
      direction,
      bearingDeg: parseBearing(bearing),
      distanceKm,
      depthMtr,
      latitudeDms,
      longitudeDms,
      latitude,
      longitude
    };

    locations.push({
      ...location,
      id: makeId(location)
    });
  }

  return {
    sector: getSector(normalizedRows),
    validity: getValidity(normalizedRows),
    source,
    fetchedAt: new Date().toISOString(),
    count: locations.length,
    locations
  };
}

async function fetchFreshMaharashtraPfz(): Promise<PfzApiResponse> {
  const workbook = await fetchMaharashtraWorkbook();
  return parseWorkbook(workbook.buffer, workbook.source);
}

async function refreshMaharashtraPfz() {
  const data = await fetchFreshMaharashtraPfz();
  await writeCachedMaharashtraPfz(data);
  return data;
}

export async function getMaharashtraPfz(): Promise<PfzApiResponse> {
  const cachedData = await readCachedMaharashtraPfz();

  if (cachedData && isFreshForCurrentAdvisory(cachedData)) {
    return cachedData;
  }

  try {
    maharashtraRefreshRequest ??= refreshMaharashtraPfz().finally(() => {
      maharashtraRefreshRequest = null;
    });

    return await maharashtraRefreshRequest;
  } catch (error) {
    if (cachedData) {
      return cachedData;
    }

    throw error;
  }
}
