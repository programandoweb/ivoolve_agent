export interface ProspectNormalizationDefaults {
  query?: string;
  city?: string;
  department?: string;
  country?: string;
  sourceType?: string;
}

type ProspectRecord = Record<string, unknown>;

function record(value: unknown): ProspectRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ProspectRecord)
    : {};
}

function firstString(source: ProspectRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(source: ProspectRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function compact<T extends ProspectRecord>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

function activityFromBusinessStatus(status?: string): 'active' | 'inactive' | 'unknown' {
  const normalized = status?.trim().toUpperCase();
  if (normalized === 'OPERATIONAL') return 'active';
  if (normalized === 'CLOSED_TEMPORARILY' || normalized === 'CLOSED_PERMANENTLY') {
    return 'inactive';
  }
  return 'unknown';
}

/**
 * Canonical Argos -> SIC contract.
 *
 * It accepts both the Google/Chrome field names already used in production and
 * the database-oriented snake_case aliases. SIC remains owner of id,
 * normalized_name, status, score and timestamps.
 */
export function normalizeProspectPayload(
  source: ProspectRecord,
  defaults: ProspectNormalizationDefaults = {},
): ProspectRecord {
  const name = firstString(source, ['name']) ?? '';
  const address = firstString(source, ['address', 'formattedAddress']);
  const phone = firstString(source, [
    'phone',
    'internationalPhoneNumber',
    'nationalPhoneNumber',
  ]);
  const website = firstString(source, ['website', 'websiteUri']);
  const domain = firstString(source, ['domain']);
  const mapsUrl = firstString(source, ['mapsUrl', 'maps_url', 'googleMapsUri']);
  const category = firstString(source, ['category', 'primaryType']);
  const city = firstString(source, ['city']) ?? defaults.city;
  const department =
    firstString(source, ['department', 'departamento']) ?? defaults.department;
  const country = (
    firstString(source, ['country']) ?? defaults.country ?? 'CO'
  ).toUpperCase();
  const placeId = firstString(source, ['placeId', 'place_id']);
  const capturedAt = firstString(source, ['capturedAt', 'captured_at']);
  const searchQuery =
    firstString(source, ['searchQuery', 'search_query']) ?? defaults.query;
  const businessStatus = firstString(source, [
    'businessStatus',
    'business_status',
  ]);
  const confidence = firstString(source, ['confidence']);
  const rating = firstNumber(source, ['rating']);
  const userRatingCount = firstNumber(source, [
    'userRatingCount',
    'reviewsCount',
    'reviews_count',
  ]);
  const sourceType =
    firstString(source, ['sourceType', 'source_type']) ??
    defaults.sourceType ??
    'google_maps';

  const incomingProfile = record(source.profile);
  const incomingDiscovery = record(incomingProfile.discovery);
  const discovery = compact({
    ...incomingDiscovery,
    provider: incomingDiscovery.provider ?? 'google_maps',
    placeId: placeId ?? incomingDiscovery.placeId,
    website: website ?? incomingDiscovery.website,
    mapsUrl: mapsUrl ?? incomingDiscovery.mapsUrl,
    rating: rating ?? incomingDiscovery.rating,
    reviewsCount: userRatingCount ?? incomingDiscovery.reviewsCount,
    businessStatus: businessStatus ?? incomingDiscovery.businessStatus,
    sourceType: sourceType ?? incomingDiscovery.sourceType,
    capturedAt: capturedAt ?? incomingDiscovery.capturedAt,
    searchQuery: searchQuery ?? incomingDiscovery.searchQuery,
    confidence: confidence ?? incomingDiscovery.confidence,
    verified:
      sourceType === 'google_maps' ||
      sourceType === 'google_maps_browser' ||
      incomingDiscovery.verified === true,
  });

  const profile = Object.keys(discovery).length
    ? { ...incomingProfile, discovery }
    : incomingProfile;

  const explicitActivity = firstString(source, ['activity']);
  const derivedActivity = activityFromBusinessStatus(businessStatus);
  const activity =
    explicitActivity && ['active', 'inactive', 'unknown'].includes(explicitActivity)
      ? explicitActivity
      : derivedActivity;

  return compact({
    name,
    address,
    phone,
    website,
    domain,
    mapsUrl,
    category,
    city,
    department,
    country,
    activity,
    notes: firstString(source, ['notes']),
    profile: Object.keys(profile).length ? profile : undefined,
    placeId,
    sourceExternalId:
      firstString(source, ['sourceExternalId', 'source_external_id']) ??
      placeId ??
      mapsUrl,
    sourceUrl:
      firstString(source, ['sourceUrl', 'source_url']) ?? mapsUrl ?? website,
    sourceType: sourceType === 'google_maps_browser' ? 'google_maps' : sourceType,
    capturedAt,
    rating,
    userRatingCount,
    businessStatus,
    confidence,
    searchQuery,
  });
}
