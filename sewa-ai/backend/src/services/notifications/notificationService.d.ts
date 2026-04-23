export declare const ROLE_SUBSCRIPTIONS: Record<string, string[]>;
type Channel = 'push' | 'email' | 'whatsapp' | 'socket' | 'sms';
export interface DispatchOptions {
    tenantId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    roles?: string[];
    userIds?: string[];
    channels?: Channel[];
    templateData?: Record<string, any>;
}
export declare function dispatch(opts: DispatchOptions): Promise<void>;
export declare const notifyUsers: typeof dispatch;
export declare function notifyCriticalFinding(opts: {
    tenantId: string;
    scanId: string;
    finding: string;
    confidence: number;
    location?: string;
    patientName?: string;
}): Promise<void>;
export declare function notifyStrokeCode(opts: {
    tenantId: string;
    scanId: string;
    finding: string;
    location: string;
    confidence: number;
}): Promise<void>;
export declare function notifyAppointmentBooked(opts: {
    tenantId: string;
    patientId: string;
    doctorId: string;
    appointmentId: string;
    date: string;
    time: string;
    type: string;
    patientName: string;
    doctorName: string;
}): Promise<void>;
export declare function notifyReportReady(opts: {
    tenantId: string;
    patientId: string;
    scanId: string;
    reportId: string;
    finding: string;
    radiologistName: string;
}): Promise<void>;
export {};
