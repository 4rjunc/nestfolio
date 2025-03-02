import { Action, Plugin } from '@elizaos/core';
import { AbiFunction } from 'viem';

declare class ContractInteractionAction {
    interactWithContract(abi: AbiFunction[], functionName: string, args: any[], target: string, chain: string, publicClient: any, walletClient?: any, user?: `0x${string}`): Promise<any>;
}
declare const contractInteractionAction: Action;

type index_ContractInteractionAction = ContractInteractionAction;
declare const index_ContractInteractionAction: typeof ContractInteractionAction;
declare const index_contractInteractionAction: typeof contractInteractionAction;
declare namespace index {
  export { index_ContractInteractionAction as ContractInteractionAction, index_contractInteractionAction as contractInteractionAction };
}

declare const gelatoPlugin: Plugin;

export { index as actions, gelatoPlugin as default, gelatoPlugin };
