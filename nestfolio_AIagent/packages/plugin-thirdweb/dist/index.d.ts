import { Action, Plugin } from '@elizaos/core';

declare const blockchainChatAction: Action;

declare const index_blockchainChatAction: typeof blockchainChatAction;
declare namespace index {
  export { index_blockchainChatAction as blockchainChatAction };
}

declare const thirdwebPlugin: Plugin;

export { index as actions, thirdwebPlugin };
