export interface WhatsAppSendOptions {
    to: string;
    type: string;
    firstName?: string;
    data?: Record<string, any>;
}
export interface RegisterWhatsAppOptions {
    userId: string;
    number: string;
    tenantId: string;
    verify?: boolean;
}
export declare const whatsappService: {
    send(opts: WhatsAppSendOptions): Promise<boolean>;
    registerNumber(opts: RegisterWhatsAppOptions): Promise<{
        success: boolean;
        verificationId?: string;
    }>;
    verifyNumber(userId: string, code: string, storedCode: string): Promise<boolean>;
    removeNumber(userId: string): Promise<void>;
    broadcast(numbers: string[], message: string): Promise<{
        sent: number;
        failed: number;
    }>;
};
