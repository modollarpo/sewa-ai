import { z } from 'zod';

// AI Triage Validation (Feature 3)
export const AIResultSchema = z.object({
  scanId: z.string().uuid(),
  primaryFinding: z.string().min(3),
  urgency: z.enum(['CRITICAL', 'URGENT', 'NORMAL']),
  confidence: z.number().min(0).max(1),
  uncertaintyScore: z.number().optional(),
  metacognitionFlags: z.array(z.string()),
});

// Tenant Onboarding (Feature 1)
export const TenantOnboardSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  region: z.enum(['uk', 'eu', 'us', 'ng', 'ke', 'za', 'gh', 'in']),
  currency: z.string().length(3),
  plan: z.enum(['starter', 'pro', 'enterprise']),
});

// Patient Record (Feature 4)
export const PatientSchema = z.object({
  mrn: z.string().min(1),
  dateOfBirth: z.string().datetime().or(z.date()),
  sex: z.enum(['M', 'F', 'O']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
});

export const PatientConsentSchema = z.object({
  consentAI: z.boolean().optional(),
  consentResearch: z.boolean().optional(),
  consentThirdParty: z.boolean().optional(),
});
