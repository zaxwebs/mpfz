export type PfzLocation = {
  id: string;
  coast: string;
  direction: string;
  bearingDeg: number | null;
  distanceKm: string;
  depthMtr: string;
  latitudeDms: string;
  longitudeDms: string;
  latitude: number;
  longitude: number;
};

export type PfzApiResponse = {
  sector: string;
  validity: string | null;
  source: string;
  fetchedAt: string;
  count: number;
  locations: PfzLocation[];
};
