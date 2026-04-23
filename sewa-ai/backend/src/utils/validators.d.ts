import { z } from 'zod';
export declare const AIResultSchema: z.ZodObject<{
    scanId: z.ZodString;
    primaryFinding: z.ZodString;
    urgency: z.ZodEnum<["CRITICAL", "URGENT", "NORMAL"]>;
    confidence: z.ZodNumber;
    uncertaintyScore: z.ZodOptional<z.ZodNumber>;
    metacognitionFlags: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    scanId?: string;
    primaryFinding?: string;
    urgency?: "CRITICAL" | "URGENT" | "NORMAL";
    confidence?: number;
    uncertaintyScore?: number;
    metacognitionFlags?: string[];
}, {
    scanId?: string;
    primaryFinding?: string;
    urgency?: "CRITICAL" | "URGENT" | "NORMAL";
    confidence?: number;
    uncertaintyScore?: number;
    metacognitionFlags?: string[];
}>;
export declare const TenantOnboardSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    region: z.ZodEnum<["uk", "eu", "us", "ng", "ke", "za", "gh", "in"]>;
    currency: z.ZodString;
    plan: z.ZodEnum<["starter", "pro", "enterprise"]>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    slug?: string;
    region?: "uk" | "eu" | "us" | "ng" | "ke" | "za" | "gh" | "in";
    currency?: string;
    plan?: "starter" | "pro" | "enterprise";
}, {
    name?: string;
    slug?: string;
    region?: "uk" | "eu" | "us" | "ng" | "ke" | "za" | "gh" | "in";
    currency?: string;
    plan?: "starter" | "pro" | "enterprise";
}>;
export declare const PatientSchema: z.ZodObject<{
    mrn: z.ZodString;
    dateOfBirth: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    sex: z.ZodEnum<["M", "F", "O"]>;
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mrn?: string;
    dateOfBirth?: string | Date;
    sex?: "M" | "F" | "O";
    firstName?: string;
    lastName?: string;
    email?: string;
}, {
    mrn?: string;
    dateOfBirth?: string | Date;
    sex?: "M" | "F" | "O";
    firstName?: string;
    lastName?: string;
    email?: string;
}>;
export declare const PatientConsentSchema: z.ZodObject<{
    consentAI: z.ZodOptional<z.ZodBoolean>;
    consentResearch: z.ZodOptional<z.ZodBoolean>;
    consentThirdParty: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    consentAI?: boolean;
    consentResearch?: boolean;
    consentThirdParty?: boolean;
}, {
    consentAI?: boolean;
    consentResearch?: boolean;
    consentThirdParty?: boolean;
}>;
