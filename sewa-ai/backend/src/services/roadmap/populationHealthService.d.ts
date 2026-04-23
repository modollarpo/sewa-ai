export type DiseaseTimeSeries = {
    date: string;
    condition: string;
    region: string;
    count: number;
    rate: number;
    trend: 'rising' | 'stable' | 'falling';
};
export type OutbreakSignal = {
    condition: string;
    region: string;
    currentRate: number;
    baselineRate: number;
    zscore: number;
    severity: 'watch' | 'warning' | 'alert';
    detectedAt: string;
};
declare class PopulationHealthService {
    /** Aggregate disease counts by region — k-anonymised */
    getDiseaseSurveillance(options: {
        startDate?: Date;
        endDate?: Date;
        region?: string;
        granularity: 'day' | 'week' | 'month';
    }): Promise<DiseaseTimeSeries[]>;
    /** Outbreak detection — Z-score anomaly detection */
    detectOutbreaks(region?: string): Promise<OutbreakSignal[]>;
    /** Condition prevalence heat map by country */
    getPrevalenceMap(condition: string, startDate?: Date, endDate?: Date): Promise<Record<string, number>>;
    /** Global summary stats for super-admin */
    getGlobalSummary(): Promise<Record<string, unknown>>;
    private groupBy;
}
export declare const populationHealthService: PopulationHealthService;
export {};
