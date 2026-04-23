/**
 * Background worker to keep SEWA AI synchronized with Hospital EMR (FHIR/HL7).
 * Implements Feature 4 compliance requirements.
 */
export declare class FHIRSyncWorker {
    private static instance;
    private isProcessing;
    private constructor();
    static getInstance(): FHIRSyncWorker;
    /**
     * Starts the polling or webhook listener for FHIR sync.
     */
    start(): Promise<void>;
    /**
     * Processes outbound syncs: Prisma -> FHIR
     */
    processPendingSyncs(): Promise<void>;
    /**
     * Inbound Sync: FHIR -> Prisma (Webhook receiver)
     */
    handleInboundWebhook(resourceType: string, data: any, tenantId: string): Promise<void>;
}
export declare const fhirSyncWorker: FHIRSyncWorker;
