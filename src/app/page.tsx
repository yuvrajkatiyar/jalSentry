'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { MapView } from '@/components/MapView';
import { HotspotCard } from '@/components/HotspotCard';
import { ReportModal } from '@/components/ReportModal';
import { LocationHotspot, RiskBand } from '@/core/types';
import { getLocations, updateAction } from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Flame,
  Info,
  Layers,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function OperationsDashboard() {
  const [locations, setLocations] = useState<LocationHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [bandFilter, setBandFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalLocationId, setReportModalLocationId] = useState<string | undefined>(undefined);

  const loadData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      const data = await getLocations();
      setLocations(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch hotspots from AWS API Gateway.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateActionStatus = async (actionId: string, status: any) => {
    try {
      await updateAction(actionId, { status });
      await loadData(false);
    } catch (err: any) {
      alert(`Failed to update intervention: ${err.message}`);
    }
  };

  const handleOpenReportModal = (locId?: string) => {
    setReportModalLocationId(locId);
    setIsReportModalOpen(true);
  };

  // Filtered hotspots
  const filteredHotspots = locations.filter((loc) => {
    const matchesBand = bandFilter === 'all' || loc.riskEvaluation.band === bandFilter;
    const matchesSearch =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.zone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBand && matchesSearch;
  });

  // Summary Metrics
  const criticalCount = locations.filter((l) => l.riskEvaluation.band === 'critical').length;
  const highCount = locations.filter((l) => l.riskEvaluation.band === 'high').length;
  const activeReportsCount = locations.reduce(
    (acc, l) => acc + l.reports.filter((r) => r.status !== 'resolved' && r.status !== 'dismissed').length,
    0
  );
  const pendingActionsCount = locations.reduce(
    (acc, l) => acc + (l.recommendedAction && l.recommendedAction.status === 'pending' ? 1 : 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header onRefresh={() => loadData(true)} isRefreshing={refreshing} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner with Problem Context & Provenance */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-blue-200">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Heat & Water Track MVP • AWS Lambda + DynamoDB Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Municipal Heat Stress & Water Priority Sentry
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Synthesizes real-time Open-Meteo weather telemetry with community shortage and leak reports to compute explainable 0–100 risk rankings. Empowers water boards to triage field verifications and mitigate pipeline loss during peak heat waves.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Operational KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
            <div className="text-xs text-zinc-500 font-medium">Critical Risk Hotspots</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <span>{criticalCount}</span>
              <span className="text-xs font-normal text-rose-500 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                Score ≥ 75
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
            <div className="text-xs text-zinc-500 font-medium">High Alert Zones</div>
            <div className="text-2xl font-black text-orange-500 flex items-center justify-between">
              <span>{highCount}</span>
              <span className="text-xs font-normal text-orange-500 bg-orange-50 dark:bg-orange-950 px-2 py-0.5 rounded">
                Score 50–74
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
            <div className="text-xs text-zinc-500 font-medium">Active Community Reports</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span>{activeReportsCount}</span>
              <span className="text-xs font-normal text-zinc-400">DynamoDB items</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-1">
            <div className="text-xs text-zinc-500 font-medium">Pending Interventions</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 flex items-center justify-between">
              <span>{pendingActionsCount}</span>
              <span className="text-xs font-normal text-purple-500 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded">
                Awaiting crew
              </span>
            </div>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {/* Risk Band Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Zones' },
              { id: 'critical', label: 'Critical' },
              { id: 'high', label: 'High' },
              { id: 'moderate', label: 'Moderate' },
              { id: 'low', label: 'Low' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBandFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  bandFilter === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search & Submit Report Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ward or zone..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => handleOpenReportModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              Report Incident
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
            <p className="text-sm text-zinc-500 font-medium">
              Connecting to AWS API Gateway & fetching telemetry...
            </p>
          </div>
        )}

        {error && (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Connection Error
            </div>
            <p className="text-xs">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="text-xs font-bold px-3 py-1.5 rounded bg-rose-600 text-white"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredHotspots.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 space-y-2">
            <Filter className="w-8 h-8 mx-auto text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              No Hotspots Match Active Filters
            </h3>
            <p className="text-xs text-zinc-500">
              Try adjusting your risk band filter or search terms.
            </p>
            <button
              onClick={() => {
                setBandFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-blue-600 underline"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Main Content Layout: Map + Ranked Hotspots */}
        {!loading && !error && filteredHotspots.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Map */}
            <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-20">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Geospatial Priority Risk Map
                </span>
                <span className="text-[11px] text-zinc-500">
                  Click a pin to inspect zone telemetry
                </span>
              </div>

              <div className="h-[460px] sm:h-[520px] w-full">
                <MapView
                  locations={filteredHotspots}
                  selectedLocationId={selectedId}
                  onSelectLocation={(id) => setSelectedId(id)}
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-[11px] text-zinc-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>
                  Map pins are scaled and colored strictly according to the deterministic heuristic score:
                  <code className="font-mono text-zinc-700 dark:text-zinc-300 ml-1">
                    0.35×Heat + 0.35×Shortage + 0.20×Supply + 0.10×Confidence
                  </code>.
                </span>
              </div>
            </div>

            {/* Right Column: Ranked Hotspots Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span>Ranked Priority Hotspots ({filteredHotspots.length})</span>
                <span className="text-[11px] text-zinc-500">Sorted by Risk Score</span>
              </div>

              <div className="space-y-4">
                {filteredHotspots.map((hotspot) => (
                  <HotspotCard
                    key={hotspot.id}
                    hotspot={hotspot}
                    isSelected={hotspot.id === selectedId}
                    onSelect={() => setSelectedId(hotspot.id)}
                    onOpenReport={(locId) => handleOpenReportModal(locId)}
                    onUpdateActionStatus={handleUpdateActionStatus}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Community Report Modal */}
      <ReportModal
        locations={locations}
        initialLocationId={reportModalLocationId}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
