// SEWA XAI — src/services/storageService.ts
// Azure Blob Storage primary, AWS S3 secondary
import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters, SASProtocol } from '@azure/storage-blob';

const AZURE_CONN   = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER    = process.env.AZURE_STORAGE_CONTAINER || 'sewa-scans';
const CDN_BASE_URL = process.env.CDN_BASE_URL || '';
const AZURE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || '';
const AZURE_KEY     = process.env.AZURE_STORAGE_KEY || '';

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

export async function generateSasUrl(blobUrl: string, expiryMinutes = 60): Promise<string> {
  if (!AZURE_ACCOUNT || !AZURE_KEY) return blobUrl;

  const urlObj = new URL(blobUrl);
  const blobName = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1) + 1); // strip leading /container/

  const credential = new StorageSharedKeyCredential(AZURE_ACCOUNT, AZURE_KEY);
  const sas = generateBlobSASQueryParameters({
    containerName: CONTAINER,
    blobName,
    permissions: BlobSASPermissions.parse('r'),
    startsOn: new Date(Date.now() - 5 * 60 * 1000), // 5 min skew
    expiresOn: new Date(Date.now() + expiryMinutes * 60 * 1000),
    protocol: SASProtocol.HttpsAndHttp,
  }, credential).toString();

  return `${blobUrl}?${sas}`;
}

export async function getBlobStream(blobUrl: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string; contentLength: number } | null> {
  if (!AZURE_CONN) return null;
  const client = BlobServiceClient.fromConnectionString(AZURE_CONN);
  const containerClient = client.getContainerClient(CONTAINER);
  const urlObj = new URL(blobUrl);
  const blobName = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1) + 1);
  const blockClient = containerClient.getBlockBlobClient(blobName);
  const response = await blockClient.download();
  if (!response.readableStreamBody) return null;
  return {
    stream: response.readableStreamBody,
    contentType: response.contentType || 'application/dicom',
    contentLength: response.contentLength || 0,
  };
}
