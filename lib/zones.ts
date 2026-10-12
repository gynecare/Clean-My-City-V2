import { supabase } from './supabaseClient';

type Ring = number[][]; // list of [longitude, latitude] pairs

type ZoneRow = {
  id: string;
  name: string;
  authority_id: string;
  priority: number;
  geojson: any;
};

export type ZoneMatch = {
  authorityId: string;
  zoneName: string | null;
  method: 'zone' | 'locality';
};

// Is the point inside one ring (a closed outline)?
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// First ring is the outside edge; any further rings are holes.
function pointInPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (rings.length === 0 || !pointInRing(lng, lat, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) {
    if (pointInRing(lng, lat, rings[k])) return false;
  }
  return true;
}

// Accepts a Polygon, MultiPolygon, Feature or FeatureCollection (GeoJSON).
export function pointInGeometry(lat: number, lng: number, geojson: any): boolean {
  if (!geojson || typeof geojson !== 'object') return false;

  if (geojson.type === 'FeatureCollection') {
    return (geojson.features ?? []).some((f: any) => pointInGeometry(lat, lng, f));
  }
  if (geojson.type === 'Feature') {
    return pointInGeometry(lat, lng, geojson.geometry);
  }
  if (geojson.type === 'Polygon') {
    return pointInPolygon(lng, lat, geojson.coordinates ?? []);
  }
  if (geojson.type === 'MultiPolygon') {
    return (geojson.coordinates ?? []).some((poly: Ring[]) => pointInPolygon(lng, lat, poly));
  }
  return false;
}

// Finds the zone containing the point. Higher priority wins when zones overlap.
export async function findZoneForPoint(
  lat: number,
  lng: number
): Promise<{ authorityId: string; zoneName: string } | null> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, name, authority_id, priority, geojson')
    .order('priority', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  for (const zone of (data ?? []) as ZoneRow[]) {
    if (pointInGeometry(lat, lng, zone.geojson)) {
      return { authorityId: zone.authority_id, zoneName: zone.name };
    }
  }
  return null;
}

// Zone first, then the locality fallback, otherwise null (= unassigned).
export async function resolveAuthority(
  lat: number,
  lng: number,
  locality?: string | null
): Promise<ZoneMatch | null> {
  const zone = await findZoneForPoint(lat, lng);
  if (zone) {
    return { authorityId: zone.authorityId, zoneName: zone.zoneName, method: 'zone' };
  }

  if (locality) {
    const { data, error } = await supabase
      .from('locality_routing')
      .select('authority_id')
      .eq('locality', locality)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      return { authorityId: data.authority_id, zoneName: null, method: 'locality' };
    }
  }

  return null;
}