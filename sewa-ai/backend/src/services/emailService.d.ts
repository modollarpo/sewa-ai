interface EmailPayload {
    to: string;
    name?: string;
    subject: string;
    template?: string;
    html?: string;
    data?: Record<string, any>;
}
export declare function sendEmail({ to, name, subject, template, html, data }: EmailPayload): Promise<void>;
export {};
