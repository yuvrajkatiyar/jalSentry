import {
  ActionIdSchema,
  ActionUpdateSchema,
  CoordinatesQuerySchema,
  LocationIdSchema,
  ReportCreateSchema,
  ReportIdSchema,
  ReportUpdateSchema,
} from '../core/schemas';
import {
  calculateRiskScore,
} from '../core/scoring';
import {
  buildRecommendedAction,
} from '../core/recommendations';
import {
  CommunityReport,
  LocationHotspot,
} from '../core/types';
import {
  getActionById,
  getActions,
  getLocationById,
  getLocations,
  getReportById,
  getReports,
  createReport,
  updateActionStatus,
  updateReportStatus,
  upsertAction,
} from './db/repository';
import { fetchWeatherObservation } from './weather/openMeteo';

export interface AppRequest {
  method: string;
  path: string; // e.g. /api/v1/health or /locations
  query: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  body?: any;
}

export interface AppResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(statusCode: number, data: any): AppResponse {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: data,
  };
}

function error(statusCode: number, message: string, details?: any): AppResponse {
  return json(statusCode, {
    error: {
      message,
      statusCode,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Normalizes incoming path to match standard /api/v1 routes
 */
function normalizePath(rawPath: string): string {
  let p = rawPath.replace(/\/+/g, '/');
  if (p.endsWith('/') && p.length > 1) {
    p = p.slice(0, -1);
  }
  return p;
}

export async function handleApiRequest(req: AppRequest): Promise<AppResponse> {
  const method = req.method.toUpperCase();
  const path = normalizePath(req.path);

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: DEFAULT_HEADERS,
      body: null,
    };
  }

  try {
    // 1. GET /api/v1/health
    if (method === 'GET' && (path === '/api/v1/health' || path === '/health')) {
      return json(200, {
        status: 'healthy',
        service: 'JalSentry API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        cloudProvider: 'AWS (Lambda / DynamoDB / API Gateway)',
      });
    }

    // 2. GET /api/v1/locations
    if (method === 'GET' && (path === '/api/v1/locations' || path === '/locations')) {
      const locations = await getLocations();
      const allReports = await getReports();

      // Assemble hotspot summaries with scoring and recommended actions
      const hotspots: LocationHotspot[] = await Promise.all(
        locations.map(async (loc) => {
          const locReports = allReports.filter((r) => r.locationId === loc.id);
          let weather = null;
          try {
            weather = await fetchWeatherObservation(loc.coordinates.latitude, loc.coordinates.longitude);
          } catch (e) {
            console.warn(`Weather fetch failed for location ${loc.id}:`, e);
          }

          const riskEvaluation = calculateRiskScore({
            weather,
            reports: locReports,
            isSimulated: loc.isSimulated || locReports.some((r) => r.isSimulated),
          });

          // Check for existing action or build fresh recommendation
          const locActions = await getActions({ locationId: loc.id });
          let action = locActions[0];
          if (!action) {
            const freshAction = buildRecommendedAction({
              locationId: loc.id,
              locationName: loc.name,
              reports: locReports,
              riskEvaluation,
            });
            if (freshAction) {
              await upsertAction(freshAction);
              action = freshAction;
            }
          }

          return {
            ...loc,
            weather: weather || undefined,
            reports: locReports,
            riskEvaluation,
            recommendedAction: action,
          };
        })
      );

      // Sort by risk score descending
      hotspots.sort((a, b) => b.riskEvaluation.overallScore - a.riskEvaluation.overallScore);

      return json(200, {
        locations: hotspots,
        count: hotspots.length,
        timestamp: new Date().toISOString(),
      });
    }

    // 3. GET /api/v1/locations/{id}
    const locationDetailMatch = path.match(/^\/(?:api\/v1\/)?locations\/([^/]+)$/);
    if (method === 'GET' && locationDetailMatch) {
      const locationId = locationDetailMatch[1];
      const parsedId = LocationIdSchema.safeParse({ id: locationId });
      if (!parsedId.success) {
        return error(400, 'Invalid location ID format', parsedId.error.flatten());
      }

      const location = await getLocationById(locationId);
      if (!location) {
        return error(404, `Location not found: ${locationId}`);
      }

      const locReports = await getReports({ locationId });
      let weather = null;
      try {
        weather = await fetchWeatherObservation(location.coordinates.latitude, location.coordinates.longitude);
      } catch (e) {
        console.warn(`Weather error for ${locationId}:`, e);
      }

      const riskEvaluation = calculateRiskScore({
        weather,
        reports: locReports,
        isSimulated: location.isSimulated || locReports.some((r) => r.isSimulated),
      });

      const locActions = await getActions({ locationId });
      let action = locActions[0];
      if (!action) {
        const fresh = buildRecommendedAction({
          locationId: location.id,
          locationName: location.name,
          reports: locReports,
          riskEvaluation,
        });
        if (fresh) {
          await upsertAction(fresh);
          action = fresh;
        }
      }

      const hotspot: LocationHotspot = {
        ...location,
        weather: weather || undefined,
        reports: locReports,
        riskEvaluation,
        recommendedAction: action,
      };

      return json(200, { location: hotspot });
    }

    // 4. GET /api/v1/weather?lat={lat}&lon={lon}
    if (method === 'GET' && (path === '/api/v1/weather' || path === '/weather')) {
      const parsedQuery = CoordinatesQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return error(400, 'Invalid latitude or longitude query parameters', parsedQuery.error.flatten());
      }

      const { lat, lon } = parsedQuery.data;
      try {
        const observation = await fetchWeatherObservation(lat, lon);
        return json(200, {
          weather: observation,
          attribution: 'Weather data provided by Open-Meteo under CC BY 4.0 license (https://open-meteo.com/)',
        });
      } catch (err: any) {
        return error(502, 'Weather upstream provider failed', { reason: err?.message || 'Upstream timeout' });
      }
    }

    // 5. POST /api/v1/reports
    if (method === 'POST' && (path === '/api/v1/reports' || path === '/reports')) {
      const parsedBody = ReportCreateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return error(400, 'Invalid report payload', parsedBody.error.flatten());
      }

      const data = parsedBody.data;
      const location = await getLocationById(data.locationId);
      if (!location) {
        return error(404, `Location not found: ${data.locationId}`);
      }

      const now = new Date().toISOString();
      const reportId = `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const newReport: CommunityReport = {
        id: reportId,
        locationId: data.locationId,
        type: data.type,
        severity: data.severity,
        description: data.description,
        status: 'unverified', // Community reports start unverified per honesty guidelines
        observationTime: data.observationTime || now,
        createdAt: now,
        isSimulated: Boolean(data.isSimulated),
        reporterContact: data.reporterContact,
      };

      await createReport(newReport);

      // Recalculate risk score and update recommended action
      const locReports = await getReports({ locationId: data.locationId });
      let weather = null;
      try {
        weather = await fetchWeatherObservation(location.coordinates.latitude, location.coordinates.longitude);
      } catch {
        // Fallback handled in calculateRiskScore
      }

      const riskEvaluation = calculateRiskScore({
        weather,
        reports: locReports,
        isSimulated: newReport.isSimulated || locReports.some((r) => r.isSimulated),
      });

      const updatedAction = buildRecommendedAction({
        locationId: location.id,
        locationName: location.name,
        reports: locReports,
        riskEvaluation,
      });

      if (updatedAction) {
        await upsertAction(updatedAction);
      }

      return json(201, {
        report: newReport,
        riskEvaluation,
        recommendedAction: updatedAction,
        message: 'Community report successfully recorded in DynamoDB',
      });
    }

    // 6. GET /api/v1/reports
    if (method === 'GET' && (path === '/api/v1/reports' || path === '/reports')) {
      const locationId = req.query.locationId;
      const reports = await getReports(locationId ? { locationId } : {});
      return json(200, {
        reports,
        count: reports.length,
      });
    }

    // 7. PATCH /api/v1/reports/{id}
    const reportPatchMatch = path.match(/^\/(?:api\/v1\/)?reports\/([^/]+)$/);
    if (method === 'PATCH' && reportPatchMatch) {
      const reportId = reportPatchMatch[1];
      const parsedId = ReportIdSchema.safeParse({ id: reportId });
      if (!parsedId.success) {
        return error(400, 'Invalid report ID format', parsedId.error.flatten());
      }

      const parsedBody = ReportUpdateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return error(400, 'Invalid report update payload', parsedBody.error.flatten());
      }

      const updated = await updateReportStatus(reportId, parsedBody.data);
      if (!updated) {
        return error(404, `Report not found: ${reportId}`);
      }

      return json(200, {
        report: updated,
        message: 'Report status updated successfully',
      });
    }

    // 8. GET /api/v1/actions
    if (method === 'GET' && (path === '/api/v1/actions' || path === '/actions')) {
      const locationId = req.query.locationId;
      const actions = await getActions(locationId ? { locationId } : {});
      return json(200, {
        actions,
        count: actions.length,
      });
    }

    // 9. PATCH /api/v1/actions/{id}
    const actionPatchMatch = path.match(/^\/(?:api\/v1\/)?actions\/([^/]+)$/);
    if (method === 'PATCH' && actionPatchMatch) {
      const actionId = actionPatchMatch[1];
      const parsedId = ActionIdSchema.safeParse({ id: actionId });
      if (!parsedId.success) {
        return error(400, 'Invalid action ID format', parsedId.error.flatten());
      }

      const parsedBody = ActionUpdateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return error(400, 'Invalid action update payload', parsedBody.error.flatten());
      }

      const updated = await updateActionStatus(actionId, parsedBody.data);
      if (!updated) {
        return error(404, `Action not found: ${actionId}`);
      }

      return json(200, {
        action: updated,
        message: 'Intervention action status updated successfully in DynamoDB',
      });
    }

    // Not found
    return error(404, `Endpoint not found: ${method} ${path}`);
  } catch (err: any) {
    console.error('Unhandled internal server error:', err);
    return error(500, 'Internal server error occurred');
  }
}
