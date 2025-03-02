import { Content, Plugin } from '@elizaos/core';

interface DataContent extends Content {
    data: string;
}
declare function isDataContent(content: DataContent): content is DataContent;

interface TransferContent extends Content {
    recipient: string;
    amount: string | number;
}
declare function isTransferContent(content: TransferContent): content is TransferContent;

declare const availPlugin: Plugin;

export { type DataContent, type TransferContent, availPlugin, availPlugin as default, isDataContent, isTransferContent };
