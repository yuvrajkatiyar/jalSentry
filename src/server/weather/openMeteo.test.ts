import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWeatherCache, fetchWeatherObservation } from './openMeteo';

describe('fetchWeatherObservation', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.restoreAllMocks();
  });

  it('normalizes Open-Meteo current weather payload', async () => {
    const mockApiResponse = {
      current: {
        time: '2026-10-10T12:00:00Z',
        temperature_2m: 36.2,
        apparent_temperature: 40.5,
        relative_humidity_2m: 52,
        precipitation: 0.0,
        wind_speed_10m: 14.2,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const obs = await fetchWeatherObservation(28.502, 77.248);

    expect(obs.temperatureC).toBe(36.2);
    expect(obs.apparentTemperatureC).toBe(40.5);
    expect(obs.relativeHumidityPercent).toBe(52);
    expect(obs.isStale).toBe(false);
    expect(obs.isFallback).toBe(false);
    expect(obs.source).toContain('Open-Meteo');
  });

  it('returns fallback marked as stale when API fails and cache is empty', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const obs = await fetchWeatherObservation(28.502, 77.248);

    expect(obs.isFallback).toBe(true);
    expect(obs.isStale).toBe(true);
    expect(obs.source).toContain('Fallback Baseline');
  });

  it('serves cached observation marked stale when subsequent network call fails', async () => {
    const mockApiResponse = {
      current: {
        time: '2026-10-10T10:00:00Z',
        temperature_2m: 32.0,
        apparent_temperature: 35.0,
        relative_humidity_2m: 45,
        precipitation: 0.0,
        wind_speed_10m: 8.0,
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    // Initial fetch succeeds
    const firstObs = await fetchWeatherObservation(28.502, 77.248);
    expect(firstObs.isStale).toBe(false);

    // Second fetch fails with forceFresh
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Rate limited'));
    const staleObs = await fetchWeatherObservation(28.502, 77.248, { forceFresh: true });

    expect(staleObs.isStale).toBe(true);
    expect(staleObs.temperatureC).toBe(32.0);
    expect(staleObs.timestamp).toBe(firstObs.timestamp);
  });
});
