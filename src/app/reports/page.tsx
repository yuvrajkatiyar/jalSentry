'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { CommunityReport, DemoLocation, ReportStatus, ReportType } from '@/core/types';
import { getLocations, getReports, submitReport, updateReport } from '@/lib/api';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Droplets,
  Filter,
  Loader2,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
} from 'lucide-react';

export default function ReportsPage() {
  const [locations, setLocations] = useState<DemoLocation[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [locationId, setLocationId] = useState('');
  const [reportType, setReportType] = useState<ReportType>('water_shortage');
  const [severity, setSeverity] = useState<number>(4);
  const [description, setDescription] = useState('');
  const [isSimulated, setIsSimulated] = useState(true);
  const [reporterContact, setReporterContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const [locs, reps] = await Promise.all([getLocations(), getReports()]);
      setLocations(locs);
      setReports(reps);
      if (!locationId && locs.length > 0) {
        setLocationId(locs[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!description.trim() || description.length < 5) {
      setFormError('Please enter a descriptive report (at least 5 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitReport({
        locationId,
        type: reportType,
        severity,
        description,
        isSimulated,
        reporterContact: reporterContact || undefined,
        observationTime: new Date().toISOString(),
      });

      setFormSuccess('Report saved in DynamoDB! Risk ranking updated.');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReportStatus = async (id: string, newStatus: ReportStatus) => {
    try {
      await updateReport(id, { status: newStatus });
      await loadData();
    } catch (err: any) {
      alert(`Failed to update report status: ${err.message}`);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const loc = locations.find((l) => l.id === r.locationId);
    const matchesSearch =
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header onRefresh={() => loadData(true)} isRefreshing={refreshing} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Droplets className="w-6 h-6 text-blue-600" />
              Community Incident Reports
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Crowdsourced and field reports saved directly to Amazon DynamoDB single-table store.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Total Reports: {reports.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Submission Form */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4 lg:sticky lg:top-20">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                Submit New Report
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Reports default to <span className="text-amber-600 font-semibold">unverified</span> status per honesty policy.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Location
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Incident Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="water_shortage">Water Shortage (Zero pressure / dry taps)</option>
                  <option value="suspected_leak">Suspected Leak / Main line burst</option>
                  <option value="supply_interruption">Supply Interruption (Truncated timings)</option>
                  <option value="water_quality">Water Quality (Turbidity / contamination)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Severity: {severity}/5
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {severity >= 4 ? 'Severe Impact' : severity === 3 ? 'Moderate' : 'Low'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description & Observations
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe observed conditions, streets affected, pressure drop duration..."
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSimulated}
                    onChange={(e) => setIsSimulated(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Mark as Simulated Data
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Reports List & Management Feed */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-zinc-400 text-[11px] mr-1">Type:</span>
                {['all', 'water_shortage', 'suspected_leak', 'supply_interruption'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      typeFilter === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {t === 'all' ? 'All' : t.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter reports..."
                  className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Reports List */}
            {loading && (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
              </div>
            )}

            {!loading && filteredReports.length === 0 && (
              <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 text-xs">
                No reports matching the selected filters.
              </div>
            )}

            <div className="space-y-3">
              {filteredReports.map((report) => {
                const loc = locations.find((l) => l.id === report.locationId);
                const isVerified = report.status === 'verified';
                const isResolved = report.status === 'resolved';

                return (
                  <div
                    key={report.id}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {loc?.name || report.locationId}
                          </span>
                          {report.isSimulated && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              SIMULATED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <span className="capitalize font-semibold text-blue-600">
                            {report.type.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span>Severity {report.severity}/5</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-3 h-3" />
                            {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                          report.status === 'verified'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : report.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : report.status === 'investigating'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      {report.description}
                    </p>

                    {/* Metadata & Operator Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ID: {report.id}
                      </span>

                      <div className="flex items-center gap-2">
                        {report.status === 'unverified' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'verified')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verify Report
                          </button>
                        )}
                        {report.status === 'verified' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
