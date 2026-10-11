import { describe, expect, it } from 'vitest';
import {
  calculateEvidenceConfidence,
  calculateRiskScore,
  normalizeHeatIndex,
} from './scoring';
import { CommunityReport, WeatherObservation } from './types';

describe('normalizeHeatIndex', () => {
  it('clamps values below 15°C to 0', () => {
    expect(normalizeHeatIndex(10)).toBe(0);
    expect(normalizeHeatIndex(15)).toBe(0);
  });

  it('clamps values above 45°C to 100', () => {
    expect(normalizeHeatIndex(45)).toBe(100);
    expect(normalizeHeatIndex(52)).toBe(100);
  });

  it('normalizes intermediate temperatures linearly', () => {
    expect(normalizeHeatIndex(30)).toBe(50);
    expect(normalizeHeatIndex(37.5)).toBe(75);
  });

  it('handles NaN gracefully', () => {
    expect(normalizeHeatIndex(NaN)).toBe(50);
  });
});

describe('calculateEvidenceConfidence', () => {
  it('returns weak confidence when no weather and no reports exist', () => {
    const res = calculateEvidenceConfidence(null, []);
    expect(res.level).toBe('weak');
    expect(res.score).toBe(0);
    expect(res.reasons).toContain('Missing weather telemetry reduces overall confidence');
  });

  it('adds bonus for live weather and report corroboration', () => {
    const liveWeather: WeatherObservation = {
      latitude: 28.5,
      longitude: 77.2,
      temperatureC: 38,
      apparentTemperatureC: 41,
      relativeHumidityPercent: 45,
      precipitationMm: 0,
      windSpeedKmh: 10,
      source: 'Open-Meteo',
      timestamp: new Date().toISOString(),
      isStale: false,
      isFallback: false,
      heatNormalized: 87,
    };

    const reports: CommunityReport[] = [
      {
        id: 'r1',
        locationId: 'loc1',
        type: 'water_shortage',
        severity: 4,
        description: 'No water',
        status: 'unverified',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: false,
      },
      {
        id: 'r2',
        locationId: 'loc1',
        type: 'water_shortage',
        severity: 5,
        description: 'Dry taps',
        status: 'verified',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: false,
      },
    ];

    const res = calculateEvidenceConfidence(liveWeather, reports);
    // live weather (+30) + 2 reports (+35) + 1 verified report (+25) = 90
    expect(res.score).toBe(90);
    expect(res.level).toBe('strong');
  });

  it('discounts stale weather data', () => {
    const staleWeather: WeatherObservation = {
      latitude: 28.5,
      longitude: 77.2,
      temperatureC: 30,
      apparentTemperatureC: 30,
      relativeHumidityPercent: 50,
      precipitationMm: 0,
      windSpeedKmh: 10,
      source: 'Open-Meteo',
      timestamp: '2026-10-10T00:00:00Z',
      isStale: true,
      isFallback: false,
      heatNormalized: 50,
    };

    const res = calculateEvidenceConfidence(staleWeather, []);
    expect(res.score).toBe(15);
    expect(res.level).toBe('weak');
    expect(res.reasons[0]).toContain('Weather data is stale');
  });
});

describe('calculateRiskScore', () => {
  it('handles missing weather input explicitly without silently setting zero risk', () => {
    const res = calculateRiskScore({
      weather: null,
      reports: [],
    });

    expect(res.missingInputs).toContain('weather');
    expect(res.components.heat).toBe(40); // neutral baseline fallback
    expect(res.reasons.some((r) => r.includes('Weather data missing'))).toBe(true);
    // 0.35 * 40 + 0 + 0 + 0 = 14 -> low band
    expect(res.overallScore).toBe(14);
    expect(res.band).toBe('low');
  });

  it('clamps risk score strictly within 0 - 100', () => {
    const extremeWeather: WeatherObservation = {
      latitude: 28.5,
      longitude: 77.2,
      temperatureC: 48,
      apparentTemperatureC: 50,
      relativeHumidityPercent: 70,
      precipitationMm: 0,
      windSpeedKmh: 5,
      source: 'Open-Meteo',
      timestamp: new Date().toISOString(),
      isStale: false,
      isFallback: false,
      heatNormalized: 100,
    };

    const extremeReports: CommunityReport[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `r-${i}`,
      locationId: 'loc1',
      type: 'water_shortage' as const,
      severity: 5,
      description: 'Severe crisis',
      status: 'verified' as const,
      observationTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isSimulated: true,
    }));

    const res = calculateRiskScore({
      weather: extremeWeather,
      reports: extremeReports,
    });

    expect(res.overallScore).toBeGreaterThanOrEqual(0);
    expect(res.overallScore).toBeLessThanOrEqual(100);
    expect(res.band).toBe('critical');
    expect(res.components.heat).toBe(100);
    expect(res.components.waterShortage).toBe(100);
  });

  it('ignores resolved and dismissed reports in risk calculation', () => {
    const weather: WeatherObservation = {
      latitude: 28.5,
      longitude: 77.2,
      temperatureC: 25,
      apparentTemperatureC: 25,
      relativeHumidityPercent: 50,
      precipitationMm: 0,
      windSpeedKmh: 10,
      source: 'Open-Meteo',
      timestamp: new Date().toISOString(),
      isStale: false,
      isFallback: false,
      heatNormalized: 33,
    };

    const resolvedReports: CommunityReport[] = [
      {
        id: 'r1',
        locationId: 'loc1',
        type: 'water_shortage',
        severity: 5,
        description: 'Old resolved shortage',
        status: 'resolved',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: false,
      },
    ];

    const res = calculateRiskScore({
      weather,
      reports: resolvedReports,
    });

    expect(res.components.waterShortage).toBe(0);
    expect(res.reasons).toContain('No active water shortage complaints logged (0/100).');
  });

  it('calculates expected score with formula weights: 0.35 * heat + 0.35 * shortage + 0.20 * supply + 0.10 * confidence', () => {
    const weather: WeatherObservation = {
      latitude: 28.5,
      longitude: 77.2,
      temperatureC: 30,
      apparentTemperatureC: 30, // heat = 50
      relativeHumidityPercent: 50,
      precipitationMm: 0,
      windSpeedKmh: 10,
      source: 'Open-Meteo',
      timestamp: new Date().toISOString(),
      isStale: false,
      isFallback: false,
      heatNormalized: 50,
    };

    const reports: CommunityReport[] = [
      {
        id: 'r1',
        locationId: 'loc1',
        type: 'water_shortage',
        severity: 3, // raw = 3 * 18 = 54
        description: 'Low water pressure',
        status: 'unverified',
        observationTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulated: false,
      },
    ];

    const res = calculateRiskScore({ weather, reports });
    expect(res.components.heat).toBe(50);
    expect(res.components.waterShortage).toBe(54);
    expect(res.components.supplyInterruption).toBe(0);
    // live weather (+30) + 1 report (+20) = 50
    expect(res.components.evidenceConfidence).toBe(50);

    // Expected: 0.35 * 50 + 0.35 * 54 + 0.20 * 0 + 0.10 * 50
    // = 17.5 + 18.9 + 0 + 5.0 = 41.4 -> Math.round -> 41
    expect(res.overallScore).toBe(41);
    expect(res.band).toBe('moderate');
  });
});
