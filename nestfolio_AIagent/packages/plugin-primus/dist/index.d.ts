import { IVerifiableInferenceAdapter, ModelProviderName, VerifiableInferenceOptions, VerifiableInferenceResult, Plugin } from '@elizaos/core';

interface PrimusOptions {
    appId: string;
    appSecret: string;
    attMode: string;
    modelProvider?: ModelProviderName;
    token?: string;
}
declare class PrimusAdapter implements IVerifiableInferenceAdapter {
    options: PrimusOptions;
    constructor(options: PrimusOptions);
    generateText(context: string, modelClass: string, options?: VerifiableInferenceOptions): Promise<VerifiableInferenceResult>;
    verifyProof(result: VerifiableInferenceResult): Promise<boolean>;
}

declare const twitterPlugin: Plugin;

export { PrimusAdapter, twitterPlugin as default, twitterPlugin };
