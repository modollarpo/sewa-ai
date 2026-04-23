export declare const PLANS: {
    starter: {
        priceUSD: number;
        scans: number;
        stripeProductId: string;
        stripePriceId: {
            uk: string;
            eu: string;
            us: string;
        };
    };
    pro: {
        priceUSD: number;
        scans: number;
        stripeProductId: string;
        stripePriceId: {
            uk: string;
            eu: string;
            us: string;
        };
    };
    enterprise: {
        priceUSD: number | null;
        scans: number | null;
    };
};
export declare function convertFromUSD(usdAmount: number, currency: string): Promise<number>;
export declare function convertFromUSDSync(usdAmount: number, currency: string): number;
export declare function createSubscription(tenantId: string, plan: string, region: string, currency: string): Promise<{
    provider: string;
    clientSecret: string;
    paymentIntentId: string;
} | {
    provider: string;
    authorizationUrl: any;
    reference: string;
} | {
    provider: string;
    paymentLink: any;
    txRef: string;
}>;
export declare function chargePerScan(tenantId: string, scanCount?: number): Promise<any>;
export declare function handleStripeWebhook(payload: Buffer, signature: string): Promise<void>;
export declare function handlePaystackWebhook(body: any): Promise<void>;
export declare function handleFlutterwaveWebhook(body: any): Promise<void>;
export declare function initiateMpesaSTK(tenantId: string, phone: string, amount: number, currency: string): Promise<{
    provider: string;
    checkoutRequestId: any;
}>;
export declare function handleMpesaWebhook(body: any): Promise<void>;
