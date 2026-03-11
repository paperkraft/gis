export type layerType = "bhuvan" | "osm" | "mapbox" | "satellite" | "terrain";

export const mapbox_token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
export const OPEN_ELEVATION_API = 'https://api.open-elevation.com/api/v1/lookup';