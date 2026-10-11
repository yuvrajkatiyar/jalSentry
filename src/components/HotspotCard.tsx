import React from 'react';
import { LocationHotspot } from '../core/types';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { WeatherCard } from './WeatherCard';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, FileText, PlusCircle, Users } from 'lucide-react';

interface HotspotCardProps {
  hotspot: LocationHotspot;
  isSelected?: boolean;
  onSelect?: () => void;
  onOpenReport?: (locationId: string) => void;
  onUpdateActionStatus?: (actionId: string, status: any) => void;
}

export const HotspotCard: React.FC<HotspotCardProps> = ({
  hotspot,
  isSelected,
  onSelect,
  onOpenReport,
  onUpdateActionStatus,
}) => {
  const { riskEvaluation, recommendedAction, reports, weather } = hotspot;
  const activeReports = reports.filter((r) => r.status !== 'resolved' && r.status !== 'dismissed');

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border transition-all cursor-pointer p-5 space-y-4 ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10 shadow-md'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {hotspot.name}
            </h3>
            {hotspot.isSimulated && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                SIMULATED DATA
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{hotspot.zone}</p>
        </div>

        <RiskBadge band={riskEvaluation.band} score={riskEvaluation.overallScore} size="lg" />
      </div>

      {/* Description & Demographics */}
      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
        {hotspot.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          {hotspot.populationServed.toLocaleString()} residents
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          {activeReports.length} active report(s)
        </span>
        <ConfidenceBadge level={riskEvaluation.evidenceConfidenceLabel} />
      </div>

      {/* Weather telemetry snippet */}
      {weather && <WeatherCard weather={weather} locationName={hotspot.name} />}

      {/* Risk Component Heuristic Breakdown */}
      <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <span>Explainable Risk Formula</span>
          <span className="text-zinc-500 font-normal text-[11px]">
            35% Heat + 35% Shortage + 20% Supply + 10% Confidence
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
          <div className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
            <div className="text-[10px] opacity-75">Heat (35%)</div>
            <div className="font-bold text-sm">{riskEvaluation.components.heat}</div>
          </div>
          <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
            <div className="text-[10px] opacity-75">Shortage (35%)</div>
            <div className="font-bold text-sm">{riskEvaluation.components.waterShortage}</div>
          </div>
          <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
            <div className="text-[10px] opacity-75">Supply (20%)</div>
            <div className="font-bold text-sm">{riskEvaluation.components.supplyInterruption}</div>
          </div>
          <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300">
            <div className="text-[10px] opacity-75">Evidence (10%)</div>
            <div className="font-bold text-sm">{riskEvaluation.components.evidenceConfidence}</div>
          </div>
        </div>
      </div>

      {/* Explanatory Reasons */}
      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1.5 text-xs">
        <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
          Scoring Rationale & Evidence
        </div>
        <ul className="space-y-1 text-zinc-600 dark:text-zinc-400 pl-4 list-disc text-[11px]">
          {riskEvaluation.reasons.slice(0, 3).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Recommended Action Box */}
      {recommendedAction && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Recommended Intervention
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                recommendedAction.status === 'resolved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : recommendedAction.status === 'in_progress'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Status: {recommendedAction.status.replace('_', ' ')}
            </span>
          </div>

          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {recommendedAction.title}
          </div>

          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            {recommendedAction.reason}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-zinc-500">
              Assigned: {recommendedAction.assignedTo || 'Unassigned'}
            </span>

            {onUpdateActionStatus && (
              <div className="flex items-center gap-1.5">
                {recommendedAction.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateActionStatus(recommendedAction.id, 'in_progress');
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Start Inspection
                  </button>
                )}
                {recommendedAction.status === 'in_progress' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateActionStatus(recommendedAction.id, 'resolved');
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenReport) onOpenReport(hotspot.id);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1"
        >
          <PlusCircle className="w-4 h-4" />
          Submit Incident Report
        </button>

        <span className="text-xs text-zinc-400 inline-flex items-center gap-0.5">
          View details <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
