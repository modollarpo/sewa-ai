import axios from 'axios';
import { logger } from './logger';
import { config } from '../config/env';
import type { OperationOutcome } from 'fhir/r4';

/**
 * UKCore FHIR Profile URLs (https://simplifier.net/ukcore)
 */
export const UKCORE_PROFILES = {
  Patient: 'https://fhir.nhs.uk/StructureDefinition/UKCore-Patient',
  ImagingStudy: 'https://fhir.nhs.uk/StructureDefinition/UKCore-ImagingStudy',
  DiagnosticReport: 'https://fhir.nhs.uk/StructureDefinition/UKCore-DiagnosticReport',
  Observation: 'https://fhir.nhs.uk/StructureDefinition/UKCore-Observation',
  Practitioner: 'https://fhir.nhs.uk/StructureDefinition/UKCore-Practitioner',
  Organization: 'https://fhir.nhs.uk/StructureDefinition/UKCore-Organization',
  Consent: 'https://fhir.nhs.uk/StructureDefinition/UKCore-Consent',
  Provenance: 'https://fhir.nhs.uk/StructureDefinition/UKCore-Provenance'
} as const;

export type UKCoreResourceType = keyof typeof UKCORE_PROFILES;

/**
 * Get the UKCore profile URL for a given resource type
 * @param resourceType The FHIR resource type
 * @returns The UKCore profile URL, or undefined if not available
 */
export function getUkCoreProfile(resourceType: string): string | undefined {
  return UKCORE_PROFILES[resourceType as UKCoreResourceType];
}

/**
 * Validate a FHIR resource (with optional UKCore profile validation)
 * @param resource The FHIR resource to validate
 * @param useUkCore Whether to validate against UKCore profile (if available)
 * @param customProfile Optional custom FHIR profile URL
 * @returns Promise resolving to true if valid, or an OperationOutcome if invalid
 */
export async function validateFhirResource(
  resource: any,
  useUkCore: boolean = true,
  customProfile?: string
): Promise<true | OperationOutcome> {
  try {
    // Get the profile URL (custom first, then UKCore if enabled)
    const profile = customProfile || (useUkCore ? getUkCoreProfile(resource.resourceType) : undefined);

    // First, try to use HL7 Validator if available (for full profile validation)
    if (profile && config.FHIR_VALIDATOR_URL) {
      const hl7Result = await validateWithHl7Validator(resource, undefined, profile);
      if (hl7Result !== true) {
        return hl7Result;
      }
    }

    // Basic structural validation (fallback)
    const issues: any[] = [];
    
    // Check for required resourceType
    if (!resource.resourceType) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: { text: 'resourceType is required' }
      });
    }

    // Check for required fields based on resourceType (basic checks)
    if (resource.resourceType === 'Patient') {
      if (!resource.name || !Array.isArray(resource.name) || resource.name.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          details: { text: 'Patient.name is required' }
        });
      }
      // UKCore-specific basic checks
      if (useUkCore) {
        const hasNhsNumber = resource.identifier?.some((id: any) => id.system === 'https://fhir.nhs.uk/Id/nhs-number');
        if (!hasNhsNumber) {
          issues.push({
            severity: 'warning',
            code: 'invariant',
            details: { text: 'UKCore-Patient recommends an NHS Number identifier' }
          });
        }
      }
    }

    // ImagingStudy UKCore checks
    if (resource.resourceType === 'ImagingStudy' && useUkCore) {
      if (!resource.modality || resource.modality.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'invariant',
          details: { text: 'UKCore-ImagingStudy recommends modality field' }
        });
      }
    }
    
    if (issues.length > 0) {
      return {
        resourceType: 'OperationOutcome',
        issue: issues
      };
    }
    
    return true;
  } catch (err) {
    logger.error('[FHIR Validator] Validation failed', err);
    return {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'exception',
          details: { text: 'Validation failed due to an internal error' },
          diagnostics: err instanceof Error ? err.stack : String(err)
        }
      ]
    };
  }
}

/**
 * Validate a FHIR resource against the HL7 FHIR Validator (requires validator service)
 * @param resource The FHIR resource to validate
 * @param validatorUrl URL of the HL7 FHIR Validator service (defaults to FHIR_VALIDATOR_URL env var)
 * @param profile Optional FHIR profile URL
 * @returns Promise resolving to true if valid, or an OperationOutcome if invalid
 */
export async function validateWithHl7Validator(
  resource: any,
  validatorUrl: string = config.FHIR_VALIDATOR_URL || 'http://localhost:8081/validate',
  profile?: string
): Promise<true | OperationOutcome> {
  try {
    if (!validatorUrl) {
      return {
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'warning',
            code: 'not-supported',
            details: { text: 'HL7 validator URL not configured, skipping profile validation' }
          }
        ]
      };
    }

    const params: Record<string, string> = {};
    if (profile) {
      params.profile = profile;
    }
    
    const response = await axios.post(validatorUrl, resource, {
      params,
      headers: { 'Content-Type': 'application/fhir+json' },
      timeout: 30000 // 30 second timeout
    });
    
    // Check if the response is an OperationOutcome with errors
    if (response.data.resourceType === 'OperationOutcome') {
      const hasErrors = response.data.issue?.some((i: any) => i.severity === 'error' || i.severity === 'fatal');
      if (!hasErrors) {
        return true;
      }
      return response.data;
    }
    
    // If response is not OperationOutcome, assume valid (fallback)
    return true;
  } catch (err) {
    logger.error('[FHIR Validator] HL7 validator call failed', err);
    return {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'warning',
          code: 'not-supported',
          details: { text: 'HL7 validator service not available, skipping profile validation' },
          diagnostics: err instanceof Error ? err.stack : String(err)
        }
      ]
    };
  }
}
