export type StrokeCodeType = 'LVO' | 'ICH' | 'AIS' | 'SAH' | 'CVST';
export type StrokeCodeEvent = {
    scanId: string;
    patientId: string;
    tenantId: string;
    codeType: StrokeCodeType;
    aiConfidence: number;
    finding: string;
    location?: string;
    midlineShift?: string;
    nihssEstimate?: number;
    gradcamUrl?: string;
};
export type StrokeCodeState = {
    codeId: string;
    scanId: string;
    codeType: StrokeCodeType;
    activatedAt: Date;
    alertsSent: string[];
    doorToAlert: number;
    resolvedAt?: Date;
    resolvedBy?: string;
    outcome?: string;
};
declare class StrokeCodeService {
    /** Activate stroke code — called immediately after metacognition passes */
    activate(event: StrokeCodeEvent): Promise<StrokeCodeState>;
    private alertRadiologists;
    private alertDoctors;
    private alertStrokeTeam;
    private sendWebSocketBroadcast;
    private sendHL7Transfer;
    private orderCTAngiography;
    private updateScanPriority;
    private getScanReceivedAt;
    /** Resolve a stroke code after treatment decision */
    resolve(codeId: string, userId: string, outcome: string): Promise<void>;
    getActiveCodes(): StrokeCodeState[];
}
export declare const strokeCodeService: StrokeCodeService;
export {};
