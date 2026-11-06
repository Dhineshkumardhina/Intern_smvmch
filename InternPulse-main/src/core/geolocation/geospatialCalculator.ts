/**
 * Geospatial Calculation Module for InternPulse
 * Implements high-precision geodesic distance algorithms:
 * - Haversine Great-Circle Distance
 * - Vincenty Ellipsoidal Geodesic Inverse Method (WGS-84)
 * - Geodesic direct forward offset calculation
 */

// WGS-84 Mean Earth Radius in meters
export const EARTH_RADIUS_METERS = 6371000.0;

// Default Maximum Allowable GPS Accuracy in meters (values > threshold are classified as LOW_ACCURACY)
export const DEFAULT_MAX_ACCURACY_THRESHOLD_METERS = 65.0;

/**
 * Converts degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Converts radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180.0) / Math.PI;
}

/**
 * Validates latitude and longitude boundaries
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

/**
 * Calculates Great-Circle distance using Haversine formula
 * Returns distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error(`Invalid geographic coordinate: [${lat1}, ${lon1}], [${lat2}, ${lon2}]`);
  }

  // Identical coordinates check
  if (lat1 === lat2 && lon1 === lon2) {
    return 0.0;
  }

  const phi1 = degreesToRadians(lat1);
  const phi2 = degreesToRadians(lat2);
  const deltaPhi = degreesToRadians(lat2 - lat1);
  const deltaLambda = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2.0) * Math.sin(deltaPhi / 2.0) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) * Math.sin(deltaLambda / 2.0);

  // Guard against floating point rounding errors exceeding 1.0
  const c = 2.0 * Math.atan2(Math.sqrt(Math.min(1.0, a)), Math.sqrt(Math.max(0.0, 1.0 - a)));

  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100; // 2 decimal precision (centimeters)
}

/**
 * Calculates geodesic distance using Vincenty's inverse formula on WGS-84 reference ellipsoid
 * Returns distance in meters. Falls back to Haversine if non-convergent (e.g. nearly antipodal).
 */
export function calculateVincentyDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error(`Invalid geographic coordinate: [${lat1}, ${lon1}], [${lat2}, ${lon2}]`);
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0.0;
  }

  const a = 6378137.0; // semi-major axis (WGS-84)
  const b = 6356752.314245; // semi-minor axis
  const f = 1.0 / 298.257223563; // flattening

  const L = degreesToRadians(lon2 - lon1);
  const U1 = Math.atan((1 - f) * Math.tan(degreesToRadians(lat1)));
  const U2 = Math.atan((1 - f) * Math.tan(degreesToRadians(lat2)));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 100;
  let sinLambda = 0;
  let cosLambda = 0;
  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let sinAlpha = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;

  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );

    if (sinSigma === 0) return 0; // Coincident points

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0; // Equatorial line

    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }

  // If non-convergent, fall back to Haversine
  if (iterLimit === 0) {
    return calculateHaversineDistance(lat1, lon1, lat2, lon2);
  }

  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  const s = b * A * (sigma - deltaSigma);
  return Math.round(s * 100) / 100;
}

/**
 * Computes a coordinate offset from an origin point given distance (meters) and bearing (degrees: 0=North, 90=East)
 */
export function computeOffsetCoordinate(
  originLat: number,
  originLon: number,
  distanceMeters: number,
  bearingDegrees: number
): { latitude: number; longitude: number } {
  if (!isValidCoordinate(originLat, originLon)) {
    throw new Error(`Invalid geographic origin coordinate: [${originLat}, ${originLon}]`);
  }

  const delta = distanceMeters / EARTH_RADIUS_METERS;
  const theta = degreesToRadians(bearingDegrees);
  const phi1 = degreesToRadians(originLat);
  const lambda1 = degreesToRadians(originLon);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const sinDelta = Math.sin(delta);
  const cosDelta = Math.cos(delta);

  const phi2 = Math.asin(sinPhi1 * cosDelta + cosPhi1 * sinDelta * Math.cos(theta));
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * sinDelta * cosPhi1,
      cosDelta - sinPhi1 * Math.sin(phi2)
    );

  return {
    latitude: Math.round(radiansToDegrees(phi2) * 1e7) / 1e7,
    longitude: Math.round(radiansToDegrees(lambda2) * 1e7) / 1e7,
  };
}

/**
 * Verifies whether GPS accuracy meets institutional threshold
 */
export function isAccuracyAdequate(
  accuracyMeters: number | null | undefined,
  threshold: number = DEFAULT_MAX_ACCURACY_THRESHOLD_METERS
): boolean {
  if (accuracyMeters === null || accuracyMeters === undefined) return false;
  if (typeof accuracyMeters !== 'number' || isNaN(accuracyMeters)) return false;
  if (accuracyMeters < 0) return false;
  return accuracyMeters <= threshold;
}

