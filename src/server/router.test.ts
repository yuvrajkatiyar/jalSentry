import { describe, expect, it } from 'vitest';
import { handleApiRequest } from './router';

describe('Router /api/v1 endpoints integration', () => {
  it('GET /api/v1/health returns 200 with service metadata', async () => {
    const res = await handleApiRequest({
      method: 'GET',
      path: '/api/v1/health',
      query: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.cloudProvider).toContain('AWS');
  });

  it('GET /api/v1/locations returns seeded demo locations with risk rankings', async () => {
    const res = await handleApiRequest({
      method: 'GET',
      path: '/api/v1/locations',
      query: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.locations.length).toBeGreaterThanOrEqual(5);
    expect(res.body.locations[0].riskEvaluation).toBeDefined();
    expect(res.body.locations[0].riskEvaluation.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/v1/locations/{id} returns 404 for unknown location', async () => {
    const res = await handleApiRequest({
      method: 'GET',
      path: '/api/v1/locations/loc-nonexistent-99',
      query: {},
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toContain('Location not found');
  });

  it('GET /api/v1/weather rejects invalid query parameters with 400', async () => {
    const res = await handleApiRequest({
      method: 'GET',
      path: '/api/v1/weather',
      query: { lat: 'invalid-latitude', lon: '77.2' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('Invalid latitude');
  });

  it('POST /api/v1/reports validates and creates report, recalculating risk score', async () => {
    const createRes = await handleApiRequest({
      method: 'POST',
      path: '/api/v1/reports',
      query: {},
      body: {
        locationId: 'loc-delhi-01',
        type: 'water_shortage',
        severity: 5,
        description: 'Testing emergency pipeline shortage',
        isSimulated: true,
      },
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.report.id).toBeDefined();
    expect(createRes.body.report.status).toBe('unverified');
    expect(createRes.body.riskEvaluation).toBeDefined();

    const reportId = createRes.body.report.id;

    // Verify GET /api/v1/reports contains this report
    const listRes = await handleApiRequest({
      method: 'GET',
      path: '/api/v1/reports',
      query: { locationId: 'loc-delhi-01' },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.reports.some((r: any) => r.id === reportId)).toBe(true);

    // PATCH /api/v1/reports/{id} updates status to verified
    const patchRes = await handleApiRequest({
      method: 'PATCH',
      path: `/api/v1/reports/${reportId}`,
      query: {},
      body: {
        status: 'verified',
      },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.report.status).toBe('verified');
  });

  it('PATCH /api/v1/actions/{id} updates intervention status and notes', async () => {
    // Get existing actions
    const listRes = await handleApiRequest({
      method: 'GET',
      path: '/api/v1/actions',
      query: {},
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.actions.length).toBeGreaterThan(0);

    const action = listRes.body.actions[0];

    const patchRes = await handleApiRequest({
      method: 'PATCH',
      path: `/api/v1/actions/${action.id}`,
      query: {},
      body: {
        status: 'in_progress',
        assignedTo: 'Rapid Response Team 7',
        notes: 'Arrived at distribution hub; measuring line pressure.',
      },
    });

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.action.status).toBe('in_progress');
    expect(patchRes.body.action.assignedTo).toBe('Rapid Response Team 7');
  });

  it('returns 400 when creating report with out-of-bounds severity', async () => {
    const res = await handleApiRequest({
      method: 'POST',
      path: '/api/v1/reports',
      query: {},
      body: {
        locationId: 'loc-delhi-01',
        type: 'water_shortage',
        severity: 99, // invalid severity > 5
        description: 'Extreme severity out of range',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('Invalid report payload');
  });
});
