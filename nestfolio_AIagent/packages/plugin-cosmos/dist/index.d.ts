import { Plugin } from '@elizaos/core';
import { chains, assets } from 'chain-registry';

interface ICosmosPluginCustomChainData {
    chainData: (typeof chains)[number];
    assets: (typeof assets)[number];
}
interface ICosmosPluginOptions {
    customChainData?: ICosmosPluginCustomChainData[];
}

declare const createCosmosPlugin: (pluginOptions?: ICosmosPluginOptions) => Plugin;

export { createCosmosPlugin, createCosmosPlugin as default };
