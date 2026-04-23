interface UploadParams {
    tenantId: string;
    file: Buffer;
    fileName: string;
    contentType: string;
    folder: string;
}
export declare function uploadToStorage(params: UploadParams): Promise<string>;
export declare function deleteFromStorage(url: string): Promise<void>;
export declare function generateSasUrl(blobName: string, expiryMinutes?: number): Promise<string>;
export {};
