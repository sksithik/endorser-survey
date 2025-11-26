export type TrustTier = 'HIGH_TRUST' | 'GENERAL' | 'RENO_TRADES';
export type ActionType =
    | 'BEFORE_AFTER_IMAGES'
    | 'BEFORE_AFTER_VIDEO'
    | 'NETWORK_VIDEO'
    | 'PERSONAL_VIDEO_TO_FRIEND'
    | 'STATIC_TESTIMONIAL_IMAGE';

export interface WizardContext {
    industry: string;
    trustTier: TrustTier;
    ROI: string;
    surveyFreeText: string;
    toneProfile: string;
    chosenActionType?: ActionType;
    chosenExampleTemplateId?: string;
    friendName?: string;
    assets?: any;
    [key: string]: any;
}

export interface RankedActionResponse {
    rankedActions: string[];
    reasons: Record<string, string>;
}

export interface PersonalizationResponse {
    friendName: string | null;
    useName: boolean;
}

export interface TemplateSelectorResponse {
    chosenExampleTemplateId: string;
    why: string;
}

export interface ScriptGeneratorResponse {
    script: string;
    estimatedReadingSeconds: number;
    engagementBoostersIncluded: string[];
    warnings: string[];
}

export interface ScriptReviewResponse {
    script: string;
    repairPerformed: boolean;
    repairNotes: string[];
    warnings: string[];
}

export interface AssetRequestResponse {
    assetInstructions: string;
    requiredAssets: string[];
}

export interface ConsentResponse {
    consentNotice: string;
}

export interface DeliveryResponse {
    deliveryInstructions: string;
}

export interface CompletionResponse {
    completionMessage: string;
}

export interface ReviewAssistResponse {
    reviewText: string;
    notes: string[];
}
