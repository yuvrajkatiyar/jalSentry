import {
  ActionStatus,
  CommunityReport,
  LocationHotspot,
  RecommendedAction,
  ReportStatus,
  ReportType,
  WeatherObservation,
} from '../core/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `API error: ${res.status} ${res.statusText}`);
  }
  return data;
}

export async function getHealth(): Promise<{ status: string; service: string; cloudProvider: string }> {
  return fetchJson(`${API_BASE}/health`);
}

export async function getLocations(): Promise<LocationHotspot[]> {
  const data = await fetchJson<{ locations: LocationHotspot[] }>(`${API_BASE}/locations`);
  return data.locations;
}

export async function getLocation(id: string): Promise<LocationHotspot> {
  const data = await fetchJson<{ location: LocationHotspot }>(`${API_BASE}/locations/${id}`);
  return data.location;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherObservation> {
  const data = await fetchJson<{ weather: WeatherObservation }>(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
  return data.weather;
}

export async function getReports(locationId?: string): Promise<CommunityReport[]> {
  const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
  const data = await fetchJson<{ reports: CommunityReport[] }>(`${API_BASE}/reports${query}`);
  return data.reports;
}

export async function submitReport(payload: {
  locationId: string;
  type: ReportType;
  severity: number;
  description: string;
  observationTime?: string;
  isSimulated?: boolean;
  reporterContact?: string;
}): Promise<{ report: CommunityReport; recommendedAction?: RecommendedAction }> {
  return fetchJson(`${API_BASE}/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReport(
  id: string,
  payload: { status: ReportStatus; severity?: number; description?: string }
): Promise<CommunityReport> {
  const data = await fetchJson<{ report: CommunityReport }>(`${API_BASE}/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.report;
}

export async function getActions(locationId?: string): Promise<RecommendedAction[]> {
  const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
  const data = await fetchJson<{ actions: RecommendedAction[] }>(`${API_BASE}/actions${query}`);
  return data.actions;
}

export async function updateAction(
  id: string,
  payload: { status: ActionStatus; assignedTo?: string; notes?: string }
): Promise<RecommendedAction> {
  const data = await fetchJson<{ action: RecommendedAction }>(`${API_BASE}/actions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.action;
}
