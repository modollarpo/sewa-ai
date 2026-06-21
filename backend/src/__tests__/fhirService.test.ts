import { syncScanToFHIR, getPatientFHIR } from '../services/fhirService';
import { config } from '../config/env';

describe('FHIR Service', () => {
  it('should silently no-op when FHIR_BASE_URL is not set', async () => {
    const orig = config.FHIR_BASE_URL;
    config.FHIR_BASE_URL = ''; // disable FHIR

    // Sync scan
    await expect(syncScanToFHIR('some-tenant-id', 'scan-123')).resolves.not.toThrow();
    
    // Get patient
    const patient = await getPatientFHIR('patient-456');
    expect(patient).toBeNull();

    config.FHIR_BASE_URL = orig;
  });
});
