import axios from 'axios';
import { config } from '../config/env';
import { logger } from './logger';

/**
 * Common FHIR terminology systems
 */
export const TERMINOLOGY_SYSTEMS = {
  SNOMED_CT: 'http://snomed.info/sct',
  LOINC: 'http://loinc.org',
  DICOM: 'http://dicom.nema.org/resources/ontology/DCM',
  DM_D: 'https://dmd.nhs.uk', // NHS Dictionary of Medicines and Devices
  NHS_NUMBER: 'https://fhir.nhs.uk/Id/nhs-number'
} as const;

/**
 * Validate a code against a terminology system (NHS Terminology Service if available)
 * @param code The code to validate
 * @param system The terminology system
 * @returns Promise of boolean (true if valid)
 */
export async function validateCode(
  code: string,
  system: string = TERMINOLOGY_SYSTEMS.SNOMED_CT
): Promise<boolean> {
  try {
    // Try NHS Terminology Service if configured
    if (config.NHS_TERMINOLOGY_URL && config.NHS_TERMINOLOGY_API_KEY) {
      logger.debug(`[Terminology] Validating code ${code} in system ${system} via NHS Terminology Service`);
      // This is a placeholder for the actual API call
      // The NHS Terminology Service API details should be updated to match the real service
      return true;
    }
    // Fallback to placeholder
    logger.debug(`[Terminology] Validating code ${code} in system ${system} (placeholder)`);
    return true;
  } catch (err) {
    logger.warn(`[Terminology] Code validation failed: ${err}`);
    return false;
  }
}

/**
 * Look up a code's display name (NHS Terminology Service if available)
 * @param code The code
 * @param system The terminology system
 * @returns Promise of display string or null
 */
export async function lookupCode(
  code: string,
  system: string = TERMINOLOGY_SYSTEMS.SNOMED_CT
): Promise<string | null> {
  try {
    // Try NHS Terminology Service if configured
    if (config.NHS_TERMINOLOGY_URL && config.NHS_TERMINOLOGY_API_KEY) {
      logger.debug(`[Terminology] Looking up code ${code} in system ${system} via NHS Terminology Service`);
      // This is a placeholder for the actual API call
      return null;
    }
    // Fallback to placeholder mappings
    logger.debug(`[Terminology] Looking up code ${code} in system ${system} (placeholder)`);
    const placeholderMappings: Record<string, Record<string, string>> = {
      [TERMINOLOGY_SYSTEMS.SNOMED_CT]: {
        '65172008': 'Intracerebral hemorrhage',
        '422504002': 'Ischemic stroke'
      },
      [TERMINOLOGY_SYSTEMS.LOINC]: {
        '18748-4': 'Diagnostic imaging study'
      }
    };
    return placeholderMappings[system]?.[code] || null;
  } catch (err) {
    logger.warn(`[Terminology] Code lookup failed: ${err}`);
    return null;
  }
}

/**
 * Translate a code from one system to another (placeholder)
 * @param code The source code
 * @param sourceSystem The source terminology system
 * @param targetSystem The target terminology system
 * @returns Promise of translated code or null
 */
export async function translateCode(
  code: string,
  sourceSystem: string,
  targetSystem: string
): Promise<string | null> {
  try {
    logger.debug(`[Terminology] Translating ${code} from ${sourceSystem} to ${targetSystem}`);
    // Placeholder - no translation logic yet
    return null;
  } catch (err) {
    logger.warn(`[Terminology] Code translation failed: ${err}`);
    return null;
  }
}

/**
 * Create a CodeableConcept
 * @param code The code
 * @param system The terminology system
 * @param display Optional display name
 * @param text Optional free text
 * @returns CodeableConcept object
 */
export function createCodeableConcept(
  code: string,
  system: string,
  display?: string,
  text?: string
): { coding: Array<{ system: string; code: string; display?: string }>; text?: string } {
  return {
    coding: [
      {
        system,
        code,
        display
      }
    ],
    text
  };
}

/**
 * Create a Coding object
 * @param code The code
 * @param system The terminology system
 * @param display Optional display name
 * @returns Coding object
 */
export function createCoding(
  code: string,
  system: string,
  display?: string
): { system: string; code: string; display?: string } {
  return {
    system,
    code,
    display
  };
}
