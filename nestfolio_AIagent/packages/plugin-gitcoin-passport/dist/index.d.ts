import { Action, Plugin } from '@elizaos/core';

declare const addressTemplate = "From previous sentence extract only the Ethereum address being asked about.\nRespond with a JSON markdown block containing only the extracted value:\n\n```json\n{\n\"address\": string | null\n}\n```\n";
declare const getPassportScoreAction: Action;

declare const gitcoinPassportPlugin: Plugin;

export { addressTemplate, gitcoinPassportPlugin as default, getPassportScoreAction, gitcoinPassportPlugin };
