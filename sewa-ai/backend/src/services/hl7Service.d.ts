declare class HL7Service {
    /**
     * Build ADT^A02 (Transfer Patient) message
     * Used by strokeCodeService to transfer patient to stroke unit
     */
    buildADT_A02(scan: any, destinationUnit: string): string;
    /**
     * Build ORM^O01 (Order) message
     * Used by strokeCodeService to order CTA Head + Neck STAT
     */
    buildORM(scan: any, orderCode: string, priority?: 'STAT' | 'URGENT' | 'ROUTINE'): string;
    /**
     * Send a pre-built HL7 message over MLLP TCP
     * Used by strokeCodeService after building messages
     */
    send(message: string, tenantId: string): Promise<string | null>;
}
export declare const hl7Service: HL7Service;
/** ORM^O01 — called on scan upload */
export declare function sendHL7ORM(scan: any): Promise<string | null>;
/** ORU^R01 — called after report is signed OR on AI triage alert */
export declare function sendHL7ORU(data: any): Promise<string | null>;
/** ADT^A02 — called during stroke code activation */
export declare function sendHL7ADT(data: any): Promise<string | null>;
export {};
