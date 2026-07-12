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
    if (config.NHS_TERMINOLOGY_URL && config.NHS_TERMINOLOGY_API_KEY) {
      logger.debug(`[Terminology] Validating code ${code} in system ${system} via NHS Terminology Service`);
      const res = await axios.get(`${config.NHS_TERMINOLOGY_URL}/validate`, {
        params: { code, system },
        headers: { 'api-key': config.NHS_TERMINOLOGY_API_KEY },
        timeout: 10000,
      });
      return res.data?.valid === true;
    }
    logger.debug(`[Terminology] Validating code ${code} in system ${system} (using FHIR $validate-code)`);
    if (config.FHIR_BASE_URL) {
      const res = await axios.get(`${config.FHIR_BASE_URL}/CodeSystem/$validate-code`, {
        params: { code, system, url: system },
        timeout: 10000,
      });
      return res.data?.parameter?.some((p: any) => p.name === 'result' && p.valueBoolean === true) ?? false;
    }
    logger.warn('[Terminology] No terminology service configured — skipping validation');
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
const PLACEHOLDER_MAPPINGS: Record<string, Record<string, string>> = {
  [TERMINOLOGY_SYSTEMS.SNOMED_CT]: {
    '65172008': 'Intracerebral hemorrhage',
    '422504002': 'Ischemic stroke',
    '722138006': 'Acute subdural hematoma',
    '230690007': 'Cerebrovascular accident',
  },
  [TERMINOLOGY_SYSTEMS.LOINC]: {
    '18748-4': 'Diagnostic imaging study',
    '55104-3': 'CT Head WO contrast',
    '55106-8': 'CT Head W contrast',
  },
  [TERMINOLOGY_SYSTEMS.DICOM]: {
    '121181': 'Detected',
    '121182': 'Not detected',
  },
};

export async function lookupCode(
  code: string,
  system: string = TERMINOLOGY_SYSTEMS.SNOMED_CT
): Promise<string | null> {
  try {
    if (config.NHS_TERMINOLOGY_URL && config.NHS_TERMINOLOGY_API_KEY) {
      logger.debug(`[Terminology] Looking up code ${code} in system ${system} via NHS Terminology Service`);
      const res = await axios.get(`${config.NHS_TERMINOLOGY_URL}/lookup`, {
        params: { code, system },
        headers: { 'api-key': config.NHS_TERMINOLOGY_API_KEY },
        timeout: 10000,
      });
      return res.data?.display ?? null;
    }
    logger.debug(`[Terminology] Looking up code ${code} in system ${system} (using FHIR)`);
    if (config.FHIR_BASE_URL) {
      const res = await axios.get(`${config.FHIR_BASE_URL}/CodeSystem/$lookup`, {
        params: { code, system },
        timeout: 10000,
      });
      const display = res.data?.parameter?.find((p: any) => p.name === 'display');
      return display?.valueString ?? PLACEHOLDER_MAPPINGS[system]?.[code] ?? null;
    }
    return PLACEHOLDER_MAPPINGS[system]?.[code] ?? null;
  } catch (err) {
    logger.warn(`[Terminology] Code lookup failed: ${err}`);
    return PLACEHOLDER_MAPPINGS[system]?.[code] ?? null;
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
    if (config.FHIR_BASE_URL) {
      const res = await axios.get(`${config.FHIR_BASE_URL}/ConceptMap/$translate`, {
        params: { code, system: sourceSystem, target: targetSystem },
        timeout: 10000,
      });
      const match = res.data?.parameter?.find((p: any) => p.name === 'match');
      return match?.valueCoding?.code ?? null;
    }
    logger.warn('[Terminology] No FHIR endpoint configured for code translation');
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
