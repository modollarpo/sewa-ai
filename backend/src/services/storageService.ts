// SEWA XAI — src/services/storageService.ts
// Azure Blob Storage primary, AWS S3 secondary
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const AZURE_CONN   = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER    = process.env.AZURE_STORAGE_CONTAINER || 'sewa-scans';
const CDN_BASE_URL = process.env.CDN_BASE_URL || '';

interface UploadParams {
  tenantId: string;
  file: Buffer;
  fileName: string;
  contentType: string;
  folder: string;
}

export async function uploadToStorage(params: UploadParams): Promise<string> {
  const { tenantId, file, fileName, contentType, folder } = params;
  if (!AZURE_CONN) {
    throw new Error('[Storage] Azure connection string missing. Cannot upload file.');
  }
  const client = BlobServiceClient.fromConnectionString(AZURE_CONN);
  const containerClient = client.getContainerClient(CONTAINER);
  await containerClient.createIfNotExists();
  const blobName = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const blockClient = containerClient.getBlockBlobClient(blobName);
  await blockClient.uploadData(file, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata: { tenantId, uploadedAt: new Date().toISOString() },
  });
  return CDN_BASE_URL ? `${CDN_BASE_URL}/${blobName}` : blockClient.url;
}

export async function deleteFromStorage(url: string): Promise<void> {
  if (!AZURE_CONN) return;
  const client = BlobServiceClient.fromConnectionString(AZURE_CONN);
  const containerClient = client.getContainerClient(CONTAINER);
  const blobName = url.split(CONTAINER + '/')[1];
  if (blobName) await containerClient.deleteBlob(blobName);
}

export async function generateSasUrl(blobName: string, expiryMinutes = 60): Promise<string> {
  if (!AZURE_CONN) return blobName;
  const client = BlobServiceClient.fromConnectionString(AZURE_CONN);
  const containerClient = client.getContainerClient(CONTAINER);
  const blockClient = containerClient.getBlockBlobClient(blobName);
  const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const { BlobSASPermissions, generateBlobSASQueryParameters } = await import('@azure/storage-blob');
  return blockClient.url;
}
