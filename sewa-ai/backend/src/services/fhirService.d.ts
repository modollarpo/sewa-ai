export declare function createFHIRImagingStudy(scan: any): Promise<string | null>;
export declare function createFHIRDiagnosticReport(report: any, scan: any): Promise<string | null>;
export declare function getFHIRPatient(fhirId: string): Promise<any | null>;
export declare function getFHIRImagingStudy(fhirId: string): Promise<any | null>;
export declare function checkFHIRHealth(): Promise<{
    enabled: boolean;
    reachable: boolean;
    server: string;
}>;
