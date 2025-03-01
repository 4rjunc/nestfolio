import { Action, Memory, Evaluator, Provider, Plugin } from '@elizaos/core';

declare const messageHandlerTemplate: string;
declare const shouldContinueTemplate: string;
declare const continueAction: Action;

declare const shouldFollowTemplate: string;
declare const followRoomAction: Action;

declare const ignoreAction: Action;

declare const shouldMuteTemplate: string;
declare const muteRoomAction: Action;

declare const noneAction: Action;

declare const unfollowRoomAction: Action;

declare const shouldUnmuteTemplate: string;
declare const unmuteRoomAction: Action;

declare const index$2_continueAction: typeof continueAction;
declare const index$2_followRoomAction: typeof followRoomAction;
declare const index$2_ignoreAction: typeof ignoreAction;
declare const index$2_messageHandlerTemplate: typeof messageHandlerTemplate;
declare const index$2_muteRoomAction: typeof muteRoomAction;
declare const index$2_noneAction: typeof noneAction;
declare const index$2_shouldContinueTemplate: typeof shouldContinueTemplate;
declare const index$2_shouldFollowTemplate: typeof shouldFollowTemplate;
declare const index$2_shouldMuteTemplate: typeof shouldMuteTemplate;
declare const index$2_shouldUnmuteTemplate: typeof shouldUnmuteTemplate;
declare const index$2_unfollowRoomAction: typeof unfollowRoomAction;
declare const index$2_unmuteRoomAction: typeof unmuteRoomAction;
declare namespace index$2 {
  export { index$2_continueAction as continueAction, index$2_followRoomAction as followRoomAction, index$2_ignoreAction as ignoreAction, index$2_messageHandlerTemplate as messageHandlerTemplate, index$2_muteRoomAction as muteRoomAction, index$2_noneAction as noneAction, index$2_shouldContinueTemplate as shouldContinueTemplate, index$2_shouldFollowTemplate as shouldFollowTemplate, index$2_shouldMuteTemplate as shouldMuteTemplate, index$2_shouldUnmuteTemplate as shouldUnmuteTemplate, index$2_unfollowRoomAction as unfollowRoomAction, index$2_unmuteRoomAction as unmuteRoomAction };
}

declare const formatFacts: (facts: Memory[]) => string;
declare const factEvaluator: Evaluator;

declare const goalEvaluator: Evaluator;

declare const index$1_factEvaluator: typeof factEvaluator;
declare const index$1_formatFacts: typeof formatFacts;
declare const index$1_goalEvaluator: typeof goalEvaluator;
declare namespace index$1 {
  export { index$1_factEvaluator as factEvaluator, index$1_formatFacts as formatFacts, index$1_goalEvaluator as goalEvaluator };
}

declare const boredomProvider: Provider;

declare const timeProvider: Provider;

declare const factsProvider: Provider;

declare const index_boredomProvider: typeof boredomProvider;
declare const index_factsProvider: typeof factsProvider;
declare const index_timeProvider: typeof timeProvider;
declare namespace index {
  export { index_boredomProvider as boredomProvider, index_factsProvider as factsProvider, index_timeProvider as timeProvider };
}

declare const bootstrapPlugin: Plugin;

export { index$2 as actions, bootstrapPlugin, bootstrapPlugin as default, index$1 as evaluators, index as providers };
