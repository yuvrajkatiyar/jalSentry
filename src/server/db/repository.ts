import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DEMO_LOCATIONS,
  INITIAL_DEMO_ACTIONS,
  INITIAL_DEMO_REPORTS,
} from '../../core/fixtures';
import {
  ActionStatus,
  CommunityReport,
  DemoLocation,
  RecommendedAction,
  ReportStatus,
} from '../../core/types';
import { getDynamoDBClient, TABLE_NAME } from './client';

// In-memory fallback store matching DynamoDB single-table structure
interface DynamoItem {
  PK: string;
  SK: string;
  entityType: 'LOCATION' | 'REPORT' | 'ACTION';
  data: any;
}

const memoryStore = new Map<string, DynamoItem>();

// Initialize memory store with demo fixtures
function initMemoryStoreIfEmpty() {
  if (memoryStore.size === 0) {
    for (const loc of DEMO_LOCATIONS) {
      const key = `LOCATION#${loc.id}#META`;
      memoryStore.set(key, {
        PK: `LOCATION#${loc.id}`,
        SK: 'META',
        entityType: 'LOCATION',
        data: loc,
      });
    }
    for (const rep of INITIAL_DEMO_REPORTS) {
      const key = `LOCATION#${rep.locationId}#REPORT#${rep.createdAt}#${rep.id}`;
      memoryStore.set(key, {
        PK: `LOCATION#${rep.locationId}`,
        SK: `REPORT#${rep.createdAt}#${rep.id}`,
        entityType: 'REPORT',
        data: rep,
      });
    }
    for (const act of INITIAL_DEMO_ACTIONS) {
      const key = `ACTION#${act.id}#META`;
      memoryStore.set(key, {
        PK: `ACTION#${act.id}`,
        SK: 'META',
        entityType: 'ACTION',
        data: act,
      });
    }
  }
}

// ----------------------------------------------------
// Locations
// ----------------------------------------------------

export async function getLocations(): Promise<DemoLocation[]> {
  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      const res = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :locPrefix) AND SK = :meta',
          ExpressionAttributeValues: {
            ':locPrefix': 'LOCATION#',
            ':meta': 'META',
          },
        })
      );
      if (res.Items && res.Items.length > 0) {
        return res.Items.map((item) => item.data as DemoLocation);
      }
      // If table is newly created and empty, seed it
      await seedLocationsIfEmpty();
      return DEMO_LOCATIONS;
    } catch (e) {
      console.warn('DynamoDB getLocations error, falling back to memory store:', e);
    }
  }

  initMemoryStoreIfEmpty();
  const results: DemoLocation[] = [];
  for (const item of Array.from(memoryStore.values())) {
    if (item.entityType === 'LOCATION') {
      results.push(item.data as DemoLocation);
    }
  }
  return results.length > 0 ? results : DEMO_LOCATIONS;
}

export async function getLocationById(id: string): Promise<DemoLocation | null> {
  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      const res = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `LOCATION#${id}`,
            SK: 'META',
          },
        })
      );
      if (res.Item) {
        return res.Item.data as DemoLocation;
      }
    } catch (e) {
      console.warn('DynamoDB getLocationById error, falling back to memory store:', e);
    }
  }

  initMemoryStoreIfEmpty();
  const key = `LOCATION#${id}#META`;
  const item = memoryStore.get(key);
  if (item && item.entityType === 'LOCATION') {
    return item.data as DemoLocation;
  }
  return DEMO_LOCATIONS.find((l) => l.id === id) || null;
}

export async function seedLocationsIfEmpty(): Promise<void> {
  const ddb = getDynamoDBClient();
  if (!ddb) return;

  for (const loc of DEMO_LOCATIONS) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `LOCATION#${loc.id}`,
          SK: 'META',
          entityType: 'LOCATION',
          data: loc,
        },
      })
    );
  }
}

// ----------------------------------------------------
// Reports
// ----------------------------------------------------

export async function createReport(report: CommunityReport): Promise<CommunityReport> {
  const ddb = getDynamoDBClient();
  const pk = `LOCATION#${report.locationId}`;
  const sk = `REPORT#${report.createdAt}#${report.id}`;

  if (ddb) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: pk,
          SK: sk,
          entityType: 'REPORT',
          reportId: report.id,
          locationId: report.locationId,
          createdAt: report.createdAt,
          data: report,
        },
      })
    );
  }

  // Also maintain in local store
  initMemoryStoreIfEmpty();
  memoryStore.set(`${pk}#${sk}`, {
    PK: pk,
    SK: sk,
    entityType: 'REPORT',
    data: report,
  });

  return report;
}

export async function getReports(options: { locationId?: string } = {}): Promise<CommunityReport[]> {
  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      if (options.locationId) {
        const res = await ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
              ':pk': `LOCATION#${options.locationId}`,
              ':skPrefix': 'REPORT#',
            },
            ScanIndexForward: false, // latest first
          })
        );
        return (res.Items || []).map((item) => item.data as CommunityReport);
      } else {
        const res = await ddb.send(
          new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
              ':skPrefix': 'REPORT#',
            },
          })
        );
        const list = (res.Items || []).map((item) => item.data as CommunityReport);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('DynamoDB getReports error, falling back to memory store:', e);
    }
  }

  initMemoryStoreIfEmpty();
  const results: CommunityReport[] = [];
  for (const item of Array.from(memoryStore.values())) {
    if (item.entityType === 'REPORT') {
      const rep = item.data as CommunityReport;
      if (!options.locationId || rep.locationId === options.locationId) {
        results.push(rep);
      }
    }
  }

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getReportById(id: string): Promise<{ report: CommunityReport; pk: string; sk: string } | null> {
  const allReports = await getReports();
  const found = allReports.find((r) => r.id === id);
  if (!found) return null;
  return {
    report: found,
    pk: `LOCATION#${found.locationId}`,
    sk: `REPORT#${found.createdAt}#${found.id}`,
  };
}

export async function updateReportStatus(
  id: string,
  updates: { status: ReportStatus; severity?: number; description?: string }
): Promise<CommunityReport | null> {
  const target = await getReportById(id);
  if (!target) return null;

  const updated: CommunityReport = {
    ...target.report,
    status: updates.status,
    ...(updates.severity !== undefined ? { severity: updates.severity } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
  };

  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: target.pk,
            SK: target.sk,
          },
          UpdateExpression: 'SET #data.#status = :status',
          ExpressionAttributeNames: {
            '#data': 'data',
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': updates.status,
          },
        })
      );
    } catch (e) {
      console.warn('DynamoDB updateReportStatus error, updating memory store:', e);
    }
  }

  // Update memory store
  const memKey = `${target.pk}#${target.sk}`;
  const existing = memoryStore.get(memKey);
  if (existing) {
    existing.data = updated;
  }

  return updated;
}

// ----------------------------------------------------
// Actions / Interventions
// ----------------------------------------------------

export async function getActions(options: { locationId?: string } = {}): Promise<RecommendedAction[]> {
  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      const res = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :actPrefix) AND SK = :meta',
          ExpressionAttributeValues: {
            ':actPrefix': 'ACTION#',
            ':meta': 'META',
          },
        })
      );
      let list = (res.Items || []).map((item) => item.data as RecommendedAction);
      if (options.locationId) {
        list = list.filter((a) => a.locationId === options.locationId);
      }
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (e) {
      console.warn('DynamoDB getActions error, falling back to memory store:', e);
    }
  }

  initMemoryStoreIfEmpty();
  const results: RecommendedAction[] = [];
  for (const item of Array.from(memoryStore.values())) {
    if (item.entityType === 'ACTION') {
      const act = item.data as RecommendedAction;
      if (!options.locationId || act.locationId === options.locationId) {
        results.push(act);
      }
    }
  }

  return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getActionById(id: string): Promise<RecommendedAction | null> {
  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      const res = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `ACTION#${id}`,
            SK: 'META',
          },
        })
      );
      if (res.Item) {
        return res.Item.data as RecommendedAction;
      }
    } catch (e) {
      console.warn('DynamoDB getActionById error, falling back to memory store:', e);
    }
  }

  initMemoryStoreIfEmpty();
  const key = `ACTION#${id}#META`;
  const item = memoryStore.get(key);
  if (item && item.entityType === 'ACTION') {
    return item.data as RecommendedAction;
  }
  return null;
}

export async function upsertAction(action: RecommendedAction): Promise<RecommendedAction> {
  const ddb = getDynamoDBClient();
  const pk = `ACTION#${action.id}`;
  const sk = 'META';

  if (ddb) {
    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: pk,
            SK: sk,
            entityType: 'ACTION',
            actionId: action.id,
            locationId: action.locationId,
            status: action.status,
            updatedAt: action.updatedAt,
            data: action,
          },
        })
      );
    } catch (e) {
      console.warn('DynamoDB upsertAction error, updating memory store:', e);
    }
  }

  initMemoryStoreIfEmpty();
  memoryStore.set(`${pk}#${sk}`, {
    PK: pk,
    SK: sk,
    entityType: 'ACTION',
    data: action,
  });

  return action;
}

export async function updateActionStatus(
  id: string,
  updates: { status: ActionStatus; assignedTo?: string; notes?: string }
): Promise<RecommendedAction | null> {
  const existing = await getActionById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: RecommendedAction = {
    ...existing,
    status: updates.status,
    ...(updates.assignedTo !== undefined ? { assignedTo: updates.assignedTo } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    updatedAt: now,
  };

  const ddb = getDynamoDBClient();
  if (ddb) {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `ACTION#${id}`,
            SK: 'META',
          },
          UpdateExpression: 'SET #data.#status = :status, #data.#updatedAt = :now' +
            (updates.assignedTo ? ', #data.#assignedTo = :assignedTo' : '') +
            (updates.notes ? ', #data.#notes = :notes' : ''),
          ExpressionAttributeNames: {
            '#data': 'data',
            '#status': 'status',
            '#updatedAt': 'updatedAt',
            ...(updates.assignedTo ? { '#assignedTo': 'assignedTo' } : {}),
            ...(updates.notes ? { '#notes': 'notes' } : {}),
          },
          ExpressionAttributeValues: {
            ':status': updates.status,
            ':now': now,
            ...(updates.assignedTo ? { ':assignedTo': updates.assignedTo } : {}),
            ...(updates.notes ? { ':notes': updates.notes } : {}),
          },
        })
      );
    } catch (e) {
      console.warn('DynamoDB updateActionStatus error, updating memory store:', e);
    }
  }

  const memKey = `ACTION#${id}#META`;
  const memItem = memoryStore.get(memKey);
  if (memItem) {
    memItem.data = updated;
  } else {
    memoryStore.set(memKey, {
      PK: `ACTION#${id}`,
      SK: 'META',
      entityType: 'ACTION',
      data: updated,
    });
  }

  return updated;
}
