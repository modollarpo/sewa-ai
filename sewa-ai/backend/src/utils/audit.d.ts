export interface AuditEntry {
    tenantId?: string;
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
export declare function auditLog(entry: AuditEntry): Promise<void>;
export declare function verifyChain(limit?: number): Promise<{
    valid: boolean;
    broken?: number;
}>;
