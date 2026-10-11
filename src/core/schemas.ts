import { z } from 'zod';

export const CoordinatesQuerySchema = z.object({
  lat: z.coerce
    .number({ invalid_type_error: 'Latitude must be a valid number' })
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  lon: z.coerce
    .number({ invalid_type_error: 'Longitude must be a valid number' })
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
});

export const ReportCreateSchema = z.object({
  locationId: z
    .string({ required_error: 'locationId is required' })
    .min(1, 'locationId must not be empty')
    .max(64, 'locationId is too long'),
  type: z.enum(['water_shortage', 'suspected_leak', 'supply_interruption', 'water_quality'], {
    errorMap: () => ({ message: 'Invalid report type' }),
  }),
  severity: z.coerce
    .number({ invalid_type_error: 'Severity must be a number' })
    .int('Severity must be an integer')
    .min(1, 'Severity must be at least 1')
    .max(5, 'Severity must be at most 5'),
  description: z
    .string({ required_error: 'description is required' })
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  observationTime: z
    .string()
    .datetime({ message: 'observationTime must be a valid ISO 8601 timestamp' })
    .optional(),
  isSimulated: z.boolean().optional().default(false),
  reporterContact: z.string().max(100).optional(),
});

export const ReportUpdateSchema = z.object({
  status: z.enum(['unverified', 'verified', 'investigating', 'resolved', 'dismissed'], {
    errorMap: () => ({ message: 'Invalid report status' }),
  }),
  severity: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .optional(),
  description: z.string().min(5).max(1000).optional(),
});

export const ActionUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved', 'dismissed'], {
    errorMap: () => ({ message: 'Invalid action status' }),
  }),
  assignedTo: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const LocationIdSchema = z.object({
  id: z.string().min(1).max(64),
});

export const ReportIdSchema = z.object({
  id: z.string().min(1).max(64),
});

export const ActionIdSchema = z.object({
  id: z.string().min(1).max(64),
});
