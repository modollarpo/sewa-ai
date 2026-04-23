"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToStorage = uploadToStorage;
exports.deleteFromStorage = deleteFromStorage;
exports.generateSasUrl = generateSasUrl;
// SEWA AI — src/services/storageService.ts
// Azure Blob Storage primary, AWS S3 secondary
const storage_blob_1 = require("@azure/storage-blob");
const AZURE_CONN = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'sewa-scans';
const CDN_BASE_URL = process.env.CDN_BASE_URL || '';
async function uploadToStorage(params) {
    const { tenantId, file, fileName, contentType, folder } = params;
    if (!AZURE_CONN) {
        console.warn('[Storage] No Azure connection string — mock URL returned');
        return `https://mock-storage.sewaxai.health/${folder}/${Date.now()}-${fileName}`;
    }
    const client = storage_blob_1.BlobServiceClient.fromConnectionString(AZURE_CONN);
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
async function deleteFromStorage(url) {
    if (!AZURE_CONN || url.includes('mock-storage'))
        return;
    const client = storage_blob_1.BlobServiceClient.fromConnectionString(AZURE_CONN);
    const containerClient = client.getContainerClient(CONTAINER);
    const blobName = url.split(CONTAINER + '/')[1];
    if (blobName)
        await containerClient.deleteBlob(blobName);
}
async function generateSasUrl(blobName, expiryMinutes = 60) {
    if (!AZURE_CONN)
        return blobName;
    const client = storage_blob_1.BlobServiceClient.fromConnectionString(AZURE_CONN);
    const containerClient = client.getContainerClient(CONTAINER);
    const blockClient = containerClient.getBlockBlobClient(blobName);
    const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const { BlobSASPermissions, generateBlobSASQueryParameters } = await Promise.resolve().then(() => __importStar(require('@azure/storage-blob')));
    return blockClient.url;
}
