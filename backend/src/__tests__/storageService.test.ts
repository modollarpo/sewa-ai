import { uploadToStorage, generateSasUrl } from '../services/storageService';

describe('Storage Service', () => {
  it('throws error when AZURE_STORAGE_CONNECTION_STRING is missing in uploadToStorage', async () => {
    // Temporarily clear it if present
    const orig = process.env.AZURE_STORAGE_CONNECTION_STRING;
    process.env.AZURE_STORAGE_CONNECTION_STRING = '';
    
    await expect(uploadToStorage({
      tenantId: 'test-tenant',
      file: Buffer.from('test'),
      fileName: 'test.dcm',
      contentType: 'application/dicom',
      folder: 'scans'
    })).rejects.toThrow('Azure connection string missing. Cannot upload file.');
    
    process.env.AZURE_STORAGE_CONNECTION_STRING = orig;
  });

  it('returns blobName when AZURE_STORAGE_CONNECTION_STRING is missing in generateSasUrl', async () => {
    const orig = process.env.AZURE_STORAGE_CONNECTION_STRING;
    process.env.AZURE_STORAGE_CONNECTION_STRING = '';

    const url = await generateSasUrl('test-blob');
    expect(url).toBe('test-blob');

    process.env.AZURE_STORAGE_CONNECTION_STRING = orig;
  });
});
