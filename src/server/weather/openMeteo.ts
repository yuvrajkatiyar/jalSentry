import { normalizeHeatIndex } from '../../core/scoring';
import { WeatherObservation } from '../../core/types';

interface CachedEntry {
  observation: WeatherObservation;
  cachedAt: number;
}

const weatherCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh window

/**
 * Open-Meteo Weather Service
 * Endpoint: https://api.open-meteo.com/v1/forecast
 * Attribution: Open-Meteo (CC BY 4.0) - https://open-meteo.com/
 * Parameters queried:
 *   - temperature_2m (°C)
 *   - relative_humidity_2m (%)
 *   - apparent_temperature (°C)
 *   - precipitation (mm)
 *   - wind_speed_10m (km/h)
 */
export async function fetchWeatherObservation(
  lat: number,
  lon: number,
  options: { forceFresh?: boolean; timeoutMs?: number } = {}
): Promise<WeatherObservation> {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && !options.forceFresh) {
    const isFresh = now - cached.cachedAt < CACHE_TTL_MS;
    if (isFresh) {
      return {
        ...cached.observation,
        isStale: false,
      };
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=auto`;
  const timeoutMs = options.timeoutMs || 5000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JalSentry-HackathonMVP/1.0 (environmental-decision-support)',
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Open-Meteo responded with HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.current) {
      throw new Error('Open-Meteo payload missing current weather block');
    }

    const temp = Number(data.current.temperature_2m ?? 30);
    const apparentTemp = Number(data.current.apparent_temperature ?? temp);
    const humidity = Number(data.current.relative_humidity_2m ?? 50);
    const precip = Number(data.current.precipitation ?? 0);
    const wind = Number(data.current.wind_speed_10m ?? 10);
    const observationTime = data.current.time ? new Date(data.current.time).toISOString() : new Date().toISOString();

    const observation: WeatherObservation = {
      latitude: lat,
      longitude: lon,
      temperatureC: Math.round(temp * 10) / 10,
      apparentTemperatureC: Math.round(apparentTemp * 10) / 10,
      relativeHumidityPercent: Math.round(humidity),
      precipitationMm: Math.round(precip * 10) / 10,
      windSpeedKmh: Math.round(wind * 10) / 10,
      source: 'Open-Meteo (CC BY 4.0)',
      timestamp: observationTime,
      isStale: false,
      isFallback: false,
      heatNormalized: normalizeHeatIndex(apparentTemp),
    };

    weatherCache.set(cacheKey, {
      observation,
      cachedAt: now,
    });

    return observation;
  } catch (error) {
    // If live fetch fails, check if we have a cached value to serve as stale
    if (cached) {
      return {
        ...cached.observation,
        isStale: true,
      };
    }

    // Explicit fallback: marked clearly as fallback and stale
    const fallbackObservation: WeatherObservation = {
      latitude: lat,
      longitude: lon,
      temperatureC: 34.0,
      apparentTemperatureC: 38.5,
      relativeHumidityPercent: 48,
      precipitationMm: 0,
      windSpeedKmh: 12.0,
      source: 'Fallback Baseline (Open-Meteo Unreachable)',
      timestamp: new Date(now - 3600 * 1000 * 2).toISOString(), // 2 hours old
      isStale: true,
      isFallback: true,
      heatNormalized: normalizeHeatIndex(38.5),
    };

    return fallbackObservation;
  }
}

export function clearWeatherCache(): void {
  weatherCache.clear();
}
