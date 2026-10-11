import React from 'react';
import { WeatherObservation } from '../core/types';
import { CloudSun, Droplets, Thermometer, Wind, AlertTriangle, ShieldCheck } from 'lucide-react';

interface WeatherCardProps {
  weather?: WeatherObservation;
  locationName: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, locationName }) => {
  if (!weather) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-4 text-center text-sm text-zinc-500">
        <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
        Weather telemetry currently unavailable for {locationName}. Applying baseline neutral estimate.
      </div>
    );
  }

  const formattedDate = new Date(weather.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudSun className="w-5 h-5 text-sky-500" />
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ambient Weather Telemetry
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          {weather.isStale && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="w-3 h-3" /> Stale Reading
            </span>
          )}
          {weather.isFallback && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              Fallback Baseline
            </span>
          )}
          {!weather.isStale && !weather.isFallback && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Live Signal
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Temp / Apparent
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {weather.temperatureC}°C <span className="text-xs font-normal text-rose-500">({weather.apparentTemperatureC}°C feels)</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Droplets className="w-3.5 h-3.5 text-blue-500" /> Humidity
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {weather.relativeHumidityPercent}%
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Precipitation
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {weather.precipitationMm} mm
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Wind className="w-3.5 h-3.5 text-teal-500" /> Wind Speed
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {weather.windSpeedKmh} km/h
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
        <span>Source: {weather.source}</span>
        <span>Observed: {formattedDate}</span>
      </div>
    </div>
  );
};
