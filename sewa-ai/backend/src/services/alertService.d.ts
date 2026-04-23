interface AlertPayload {
    tenantId: string;
    scanId: string;
    aiResultId: string;
    urgency: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
    primaryFinding: string;
    confidence: number;
    gradCamUrl?: string;
    doorToAlertMs: number;
}
declare class AlertService {
    dispatch(payload: AlertPayload): Promise<void>;
    private sendFCM;
    private sendEmailAlerts;
    private sendHL7Alert;
    private sendWhatsApp;
    private sendSMS;
    private activateStrokeCode;
}
export declare const alertService: AlertService;
export {};
