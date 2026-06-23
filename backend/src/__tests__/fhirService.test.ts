import { getFHIRPatient, getFHIRImagingStudy } from '../services/fhirService';
import { config } from '../config/env';

// Mock the config
jest.mock('../config/env', () => ({
  config: {
    FHIR_BASE_URL: '',
    FHIR_TENANT_ID: '',
    FHIR_CLIENT_ID: '',
    FHIR_CLIENT_SECRET: ''
  }
}));

describe('FHIR Service', () => {
  it('should silently no-op when FHIR_BASE_URL is not set', async () => {
    // Get patient
    const patient = await getFHIRPatient('patient-456');
    expect(patient).toBeNull();

    // Get imaging study
    const study = await getFHIRImagingStudy('study-123');
    expect(study).toBeNull();
  });
});
