export declare const EMAIL_TEMPLATES: Record<string, (d: any) => {
    subject: string;
    html: string;
}>;
export interface SendTemplatedOptions {
    to: string;
    type: string;
    data: Record<string, any>;
    recipientEmail?: string;
    unsubscribeUrl?: string;
}
export declare const emailService: {
    sendTemplated(opts: SendTemplatedOptions): Promise<boolean>;
    sendRaw(opts: {
        to: string;
        subject: string;
        html: string;
    }): Promise<boolean>;
};
