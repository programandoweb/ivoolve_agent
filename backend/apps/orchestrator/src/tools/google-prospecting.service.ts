import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ProspectPlace {
  source: 'google_maps';
  confidence: 'high';
  placeId: string;
  name: string;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryType?: string;
}


export interface ProspectPlaceReview {
  author?: string;
  authorUri?: string;
  rating?: number;
  text?: string;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  googleMapsUri?: string;
}

export interface ProspectPlaceReviewsResult {
  source: 'google_maps_reviews';
  placeId: string;
  name?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  reviewSummary?: string;
  reviews: ProspectPlaceReview[];
}

export interface ProspectWebResult {
  source: 'google_search';
  confidence: 'medium';
  title: string;
  link: string;
  snippet?: string;
  displayLink?: string;
}

@Injectable()
export class GoogleProspectingService {
  constructor(private readonly config: ConfigService) {}

  async searchPlaces(
    textQuery: string,
    maxResults = 10,
  ): Promise<ProspectPlace[]> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY')?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GOOGLE_MAPS_API_KEY no está configurada.',
      );
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.googleMapsUri',
            'places.rating',
            'places.userRatingCount',
            'places.businessStatus',
            'places.primaryType',
          ].join(','),
        },
        body: JSON.stringify({
          textQuery,
          pageSize: Math.min(Math.max(maxResults, 1), 20),
          languageCode: 'es',
          regionCode: 'CO',
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `Google Places respondió ${response.status}: ${detail.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        nationalPhoneNumber?: string;
        internationalPhoneNumber?: string;
        websiteUri?: string;
        googleMapsUri?: string;
        rating?: number;
        userRatingCount?: number;
        businessStatus?: string;
        primaryType?: string;
      }>;
    };

    return (payload.places ?? [])
      .filter((place) => Boolean(place.id && place.displayName?.text))
      .map((place) => ({
        source: 'google_maps' as const,
        confidence: 'high' as const,
        placeId: place.id!,
        name: place.displayName!.text!,
        formattedAddress: place.formattedAddress,
        nationalPhoneNumber: place.nationalPhoneNumber,
        internationalPhoneNumber: place.internationalPhoneNumber,
        websiteUri: place.websiteUri,
        googleMapsUri: place.googleMapsUri,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        businessStatus: place.businessStatus,
        primaryType: place.primaryType,
      }));
  }


  async getPlaceReviews(
    placeId: string,
    maxReviews = 5,
  ): Promise<ProspectPlaceReviewsResult> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY')?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GOOGLE_MAPS_API_KEY no está configurada.',
      );
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'id',
            'displayName',
            'googleMapsUri',
            'rating',
            'userRatingCount',
            'reviews',
            'reviewSummary',
          ].join(','),
          'Accept-Language': 'es-CO,es;q=0.9',
        },
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `Google Place Details respondió ${response.status}: ${detail.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as {
      id?: string;
      displayName?: { text?: string };
      googleMapsUri?: string;
      rating?: number;
      userRatingCount?: number;
      reviewSummary?: {
        text?: { text?: string } | string;
      };
      reviews?: Array<{
        authorAttribution?: {
          displayName?: string;
          uri?: string;
        };
        rating?: number;
        text?: { text?: string };
        originalText?: { text?: string };
        relativePublishTimeDescription?: string;
        publishTime?: string;
        googleMapsUri?: string;
      }>;
    };

    const summaryText =
      typeof payload.reviewSummary?.text === 'string'
        ? payload.reviewSummary.text
        : payload.reviewSummary?.text?.text;

    return {
      source: 'google_maps_reviews',
      placeId: payload.id ?? placeId,
      name: payload.displayName?.text,
      googleMapsUri: payload.googleMapsUri,
      rating: payload.rating,
      userRatingCount: payload.userRatingCount,
      reviewSummary: summaryText,
      reviews: (payload.reviews ?? [])
        .slice(0, Math.min(Math.max(maxReviews, 1), 5))
        .map((review) => ({
          author: review.authorAttribution?.displayName,
          authorUri: review.authorAttribution?.uri,
          rating: review.rating,
          text: review.text?.text ?? review.originalText?.text,
          relativePublishTimeDescription:
            review.relativePublishTimeDescription,
          publishTime: review.publishTime,
          googleMapsUri: review.googleMapsUri,
        })),
    };
  }

  async searchWeb(
    query: string,
    maxResults = 10,
  ): Promise<ProspectWebResult[]> {
    const apiKey = this.config.get<string>('GOOGLE_SEARCH_API_KEY')?.trim() || this.config.get<string>('GOOGLE_MAPS_API_KEY')?.trim();
    const cx = this.config.get<string>('GOOGLE_SEARCH_ENGINE_ID')?.trim() || '878d7f5f2f1864a4d';

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GOOGLE_SEARCH_API_KEY (o GOOGLE_MAPS_API_KEY con Custom Search JSON API habilitada) debe estar configurada para Google Search.',
      );
    }

    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: String(Math.min(Math.max(maxResults, 1), 10)),
      hl: 'es',
      gl: 'co',
    });

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `Google Search respondió ${response.status}: ${detail.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as {
      items?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
        displayLink?: string;
      }>;
    };

    return (payload.items ?? [])
      .filter((item) => Boolean(item.title && item.link))
      .map((item) => ({
        source: 'google_search' as const,
        confidence: 'medium' as const,
        title: item.title!,
        link: item.link!,
        snippet: item.snippet,
        displayLink: item.displayLink,
      }));
  }
}
