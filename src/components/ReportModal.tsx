'use client';

import React, { useState } from 'react';
import { DemoLocation, ReportType } from '../core/types';
import { submitReport } from '../lib/api';
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';

interface ReportModalProps {
  locations: DemoLocation[];
  initialLocationId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  locations,
  initialLocationId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [locationId, setLocationId] = useState(initialLocationId || locations[0]?.id || '');
  const [type, setType] = useState<ReportType>('water_shortage');
  const [severity, setSeverity] = useState<number>(4);
  const [description, setDescription] = useState('');
  const [isSimulated, setIsSimulated] = useState(true);
  const [reporterContact, setReporterContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!description.trim() || description.length < 5) {
      setErrorMsg('Please provide a detailed description (at least 5 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitReport({
        locationId,
        type,
        severity,
        description,
        isSimulated,
        reporterContact: reporterContact || undefined,
        observationTime: new Date().toISOString(),
      });

      setSuccessMsg('Report submitted successfully! Risk score recalculated in DynamoDB.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report to AWS API Gateway / DynamoDB.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Submit Community Water Incident Report
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Reports will be recorded with status <span className="font-semibold text-amber-600">UNVERIFIED</span> and trigger an automated risk recalculation.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Location Picker */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Select Demo Location
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

          {/* Issue Type */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Issue Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'water_shortage', label: 'Water Shortage' },
                { value: 'suspected_leak', label: 'Suspected Leak / Burst' },
                { value: 'supply_interruption', label: 'Supply Interruption' },
                { value: 'water_quality', label: 'Water Quality Deficit' },
              ].map((item) => (
                <label
                  key={item.value}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    type === item.value
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={item.value}
                    checked={type === item.value}
                    onChange={() => setType(item.value as ReportType)}
                    className="sr-only"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Reported Severity Level
              </label>
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                {severity} / 5 ({severity >= 4 ? 'Severe' : severity === 3 ? 'Moderate' : 'Low'})
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>1 - Minor trickling</span>
              <span>3 - Pressure loss</span>
              <span>5 - Complete dry tap / burst</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Field Description & Landmark
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Tanker did not arrive for scheduled slot; taps running dry across Block D for 24 hours."
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Contact & Simulated Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Reporter Identifier (Optional)
              </label>
              <input
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="ward-agent@demo"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={isSimulated}
                  onChange={(e) => setIsSimulated(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Mark as Demo / Simulated Data
                </span>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Report to DynamoDB
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
