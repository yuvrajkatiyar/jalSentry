'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { ActionStatus, RecommendedAction } from '@/core/types';
import { getActions, updateAction } from '@/lib/api';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Wrench,
} from 'lucide-react';

export default function InterventionsPage() {
  const [actions, setActions] = useState<RecommendedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [assignedCrew, setAssignedCrew] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const data = await getActions();
      setActions(data);
    } catch (err: any) {
      console.error('Failed to load actions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (
    id: string,
    newStatus: ActionStatus,
    extra: { assignedTo?: string; notes?: string } = {}
  ) => {
    try {
      setIsUpdating(true);
      await updateAction(id, {
        status: newStatus,
        ...extra,
      });
      setUpdateSuccess(`Intervention ${id} successfully updated in DynamoDB!`);
      setEditingActionId(null);
      await loadData();
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err: any) {
      alert(`Error updating intervention: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredActions = actions.filter((act) => {
    const matchesStatus = statusFilter === 'all' || act.status === statusFilter;
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header onRefresh={() => loadData(true)} isRefreshing={refreshing} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Wrench className="w-6 h-6 text-blue-600" />
              Municipal Intervention Queue
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Rule-based recommended field dispatches for water-shortage verification and suspected-leak repairs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Total Interventions: {actions.length}
            </span>
          </div>
        </div>

        {updateSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{updateSuccess}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'pending', 'in_progress', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions or locations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
            <p className="text-xs text-zinc-500 mt-2">Loading actions from DynamoDB table...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredActions.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 text-xs">
            No interventions match active filter criteria.
          </div>
        )}

        {/* Actions Table / List */}
        {!loading && filteredActions.length > 0 && (
          <div className="space-y-4">
            {filteredActions.map((act) => {
              const isEditing = editingActionId === act.id;

              return (
                <div
                  key={act.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4"
                >
                  {/* Action Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                          {act.title}
                        </span>
                        {act.isSimulated && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            SIMULATED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {act.locationName}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{act.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          Updated {new Date(act.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <RiskBadge band={act.priority} />
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                          act.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : act.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {act.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Reason & Evidence */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                      <span>Operational Reason:</span>
                      <ConfidenceBadge level={act.confidence} />
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {act.reason}
                    </p>
                  </div>

                  {/* Assignment and Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                      <div className="text-[11px] text-zinc-400 font-medium">Assigned Field Unit</div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {act.assignedTo || 'Unassigned — Awaiting Dispatch'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                      <div className="text-[11px] text-zinc-400 font-medium">Field Dispatch Notes</div>
                      <div className="text-zinc-600 dark:text-zinc-400 mt-0.5 text-[11px]">
                        {act.notes || 'No dispatch notes recorded.'}
                      </div>
                    </div>
                  </div>

                  {/* Edit Form Drawer if active */}
                  {isEditing && (
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-3 text-xs">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        Update Dispatch Status & Notes (DynamoDB Persisted)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                            Assign Crew / Agent
                          </label>
                          <input
                            type="text"
                            value={assignedCrew}
                            onChange={(e) => setAssignedCrew(e.target.value)}
                            placeholder="e.g. Unit 3 (Rapid Leak Repair)"
                            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                            Operational Notes
                          </label>
                          <input
                            type="text"
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            placeholder="e.g. Valve pressure checked at 1.8 bar"
                            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingActionId(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(act.id, 'in_progress', {
                              assignedTo: assignedCrew || act.assignedTo,
                              notes: actionNotes || act.notes,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5"
                        >
                          {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Save In Progress
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(act.id, 'resolved', {
                              assignedTo: assignedCrew || act.assignedTo,
                              notes: actionNotes || act.notes,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1.5"
                        >
                          {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Save as Resolved
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card Footer with Quick Status Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      DynamoDB Key: PK=ACTION#{act.id}
                    </span>

                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingActionId(act.id);
                            setAssignedCrew(act.assignedTo || '');
                            setActionNotes(act.notes || '');
                          }}
                          className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                        >
                          Edit Dispatch
                        </button>
                      )}

                      {act.status === 'pending' && !isEditing && (
                        <button
                          onClick={() => handleUpdateStatus(act.id, 'in_progress')}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                        >
                          Start Investigation
                        </button>
                      )}

                      {act.status === 'in_progress' && !isEditing && (
                        <button
                          onClick={() => handleUpdateStatus(act.id, 'resolved')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
