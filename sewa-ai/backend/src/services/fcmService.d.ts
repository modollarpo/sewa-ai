export declare function sendFCMPush({ token, title, body, data }: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}): Promise<void>;
export declare function sendFCMToTopic(topic: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
