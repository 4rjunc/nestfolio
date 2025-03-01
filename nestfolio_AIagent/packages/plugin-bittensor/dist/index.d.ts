import { Memory, Action, Evaluator, Provider, Plugin } from '@elizaos/core';

interface AIImageAnalysisMemory extends Memory {
    content: {
        text: string;
        imageUrl: string;
        isAIGenerated: boolean;
        confidenceScore: number;
        imageSource: 'tweet' | 'url';
        actionType: string;
    };
}
declare const formatAnalysisHistory: (analyses: AIImageAnalysisMemory[]) => string;
declare const analyzeImage: Action;
declare const analysisHistory: Action;

declare const index$2_analysisHistory: typeof analysisHistory;
declare const index$2_analyzeImage: typeof analyzeImage;
declare const index$2_formatAnalysisHistory: typeof formatAnalysisHistory;
declare namespace index$2 {
  export { index$2_analysisHistory as analysisHistory, index$2_analyzeImage as analyzeImage, index$2_formatAnalysisHistory as formatAnalysisHistory };
}

declare const formatFacts: (facts: Memory[]) => string;
declare const factEvaluator: Evaluator;

declare const index$1_factEvaluator: typeof factEvaluator;
declare const index$1_formatFacts: typeof formatFacts;
declare namespace index$1 {
  export { index$1_factEvaluator as factEvaluator, index$1_formatFacts as formatFacts };
}

declare const timeProvider: Provider;

declare const index_timeProvider: typeof timeProvider;
declare namespace index {
  export { index_timeProvider as timeProvider };
}

declare const bittensorPlugin: Plugin;

export { index$2 as actions, bittensorPlugin, bittensorPlugin as default, index$1 as evaluators, index as providers };
