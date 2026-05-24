import * as cheerio from 'cheerio';

export interface AppMetadata {
  name: string;
  developer: string;
  icon: string;
  category: string;
  country: string;
  description: string;
  screenshots: string[];
  ratings: {
    average: string;
    count: string;
  };
  subtitle: string;
  url: string;
}

export async function fetchAppStoreData(url: string): Promise<AppMetadata | null> {
  try {
    // Extract ID from the URL (e.g. id324684580)
    const idMatch = url.match(/\/id(\d+)/);
    if (!idMatch || !idMatch[1]) {
      throw new Error(`Invalid App Store URL: could not find /id<number> in "${url}"`);
    }
    const appId = idMatch[1];
    console.log(`[SCRAPER] Extracted appId: ${appId} from URL: ${url}`);
    
    // Extract country code from URL or default to US
    const urlParts = new URL(url);
    const countryMatch = urlParts.pathname.match(/^\/([a-z]{2})\//i);
    const country = countryMatch ? countryMatch[1].toUpperCase() : 'US';
    console.log(`[SCRAPER] Using country: ${country}`);

    // Use Apple's official public iTunes API with a 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    const apiUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
    console.log(`[SCRAPER] Fetching: ${apiUrl}`);

    let response: Response;
    try {
      response = await fetch(apiUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`iTunes API HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    console.log(`[SCRAPER] iTunes API resultCount: ${json.resultCount}`);
    if (!json.results || json.results.length === 0) {
      throw new Error('No app data found for this ID in the iTunes API.');
    }

    const data = json.results[0];
    console.log(`[SCRAPER] Found app: "${data.trackName}" by "${data.artistName}"`);

    return {
      name: data.trackName || 'Unknown App',
      developer: data.artistName || 'Unknown Developer',
      icon: data.artworkUrl512 || data.artworkUrl100 || '',
      category: data.primaryGenreName || 'Unknown',
      country: country,
      description: data.description || '',
      screenshots: (data.screenshotUrls || []).slice(0, 10),
      ratings: {
        average: data.averageUserRating ? data.averageUserRating.toFixed(1) : '0.0',
        count: data.userRatingCount ? data.userRatingCount.toString() : '0'
      },
      subtitle: '', // iTunes API does not expose subtitle
      url: data.trackViewUrl || url
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error('[SCRAPER] iTunes API timed out after 10 seconds');
    } else {
      console.error('[SCRAPER] Error fetching App Store data:', error?.message ?? error);
    }
    return null;
  }
}
