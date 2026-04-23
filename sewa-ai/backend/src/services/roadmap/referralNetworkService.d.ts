export type ReferralPriority = 'STAT' | 'URGENT' | 'ROUTINE';
export type ReferralRequest = {
    scanId: string;
    requestingUserId: string;
    tenantId: string;
    speciality: string;
    reason: string;
    aiSummary: string;
    priority: ReferralPriority;
    allowCrossBorder: boolean;
};
export type ReferralMatch = {
    specialistId: string;
    specialistName: string;
    speciality: string;
    hospital: string;
    region: string;
    expertiseScore: number;
    avgResponseHrs: number;
    isAvailable: boolean;
    isTelemedicine: boolean;
    distance?: string;
};
declare class ReferralNetworkService {
    /** Find best-matched specialists for a case */
    findSpecialists(request: ReferralRequest, aiResult: {
        primaryFinding: string;
    }): Promise<ReferralMatch[]>;
    /** Create and dispatch a referral */
    createReferral(request: ReferralRequest, specialistId: string, _aiResult: unknown): Promise<unknown>;
}
export declare const referralNetworkService: ReferralNetworkService;
export declare function escalateOverdueReferrals(): Promise<void>;
export {};
