import { IVerifiableInferenceAdapter, ModelProviderName, VerifiableInferenceOptions, VerifiableInferenceResult } from '@elizaos/core';

interface OpacityOptions {
    modelProvider?: ModelProviderName;
    token?: string;
    teamId?: string;
    teamName?: string;
    opacityProverUrl: string;
}
declare class OpacityAdapter implements IVerifiableInferenceAdapter {
    options: OpacityOptions;
    constructor(options: OpacityOptions);
    generateText(context: string, modelClass: string, options?: VerifiableInferenceOptions): Promise<VerifiableInferenceResult>;
    generateProof(baseUrl: string, logId: string): Promise<any>;
    verifyProof(result: VerifiableInferenceResult): Promise<boolean>;
}

export { OpacityAdapter, OpacityAdapter as default };
