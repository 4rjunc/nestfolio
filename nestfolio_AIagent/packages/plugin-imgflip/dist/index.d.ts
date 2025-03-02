import { Action, IAgentRuntime, State, Plugin } from '@elizaos/core';

interface Meme {
    url: string;
    text: string;
}
declare function generateMemeActionHandler(runtime: IAgentRuntime, message: string, state: State): Promise<Meme>;
declare const generateMemeAction: Action;

declare const imgflipPlugin: Plugin;

export { type Meme, imgflipPlugin as default, generateMemeAction, generateMemeActionHandler, imgflipPlugin };
