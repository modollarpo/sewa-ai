export type Condition = {
    field: 'finding' | 'urgency' | 'confidence' | 'modality' | 'bodyPart' | 'uncertainty';
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
    value: string | number | string[];
};
export type ActionType = 'notify_user' | 'notify_role' | 'notify_oncall' | 'hl7_order' | 'hl7_transfer' | 'page_team' | 'escalate_priority' | 'create_task' | 'webhook';
export type Action = {
    type: ActionType;
    target?: string;
    message?: string;
    hl7Data?: Record<string, string>;
    priority?: 'STAT' | 'URGENT' | 'ROUTINE';
};
export type ClinicalRule = {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    enabled: boolean;
    conditions: Condition[];
    conditionLogic: 'AND' | 'OR';
    actions: Action[];
    pathway?: 'stroke' | 'pe' | 'trauma' | 'tb' | 'custom';
    cooldownMs: number;
    createdBy: string;
    version: number;
};
export declare const BUILT_IN_RULES: Omit<ClinicalRule, 'id' | 'tenantId' | 'createdBy' | 'version'>[];
declare class ClinicalRulesEngine {
    /** Evaluate all enabled tenant rules against an AI result */
    evaluate(tenantId: string, scanId: string, aiResult: {
        primaryFinding: string;
        urgency: string;
        confidence: number;
        modality: string;
        bodyPart: string;
        uncertaintyScore: number;
    }): Promise<{
        triggered: string[];
        actions: string[];
    }>;
    private matchCondition;
    private executeAction;
    getRules(tenantId: string): Promise<ClinicalRule[]>;
}
export declare const clinicalRulesEngine: ClinicalRulesEngine;
export {};
