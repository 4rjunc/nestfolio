import { Content, Plugin } from '@elizaos/core';

declare const EthStorageAbi: readonly string[];
declare function stringToHex(s: string): string;
declare function sendData(RPC: string, privateKey: string, address: string, key: string, data: Buffer): Promise<string>;

interface TransferContent extends Content {
    recipient: string;
    amount: string | number;
}
declare function isTransferContent(content: TransferContent): content is TransferContent;

declare const ethstoragePlugin: Plugin;

export { EthStorageAbi, type TransferContent, ethstoragePlugin as default, ethstoragePlugin, isTransferContent, sendData, stringToHex };
