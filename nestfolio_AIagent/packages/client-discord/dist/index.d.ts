import { IAgentRuntime, Character, Client as Client$1 } from '@elizaos/core';
import { Client, MessageReaction, User } from 'discord.js';
import { EventEmitter } from 'events';

declare class DiscordClient extends EventEmitter {
    apiToken: string;
    client: Client;
    runtime: IAgentRuntime;
    character: Character;
    private messageManager;
    private voiceManager;
    constructor(runtime: IAgentRuntime);
    private setupEventListeners;
    stop(): Promise<void>;
    private onClientReady;
    handleReactionAdd(reaction: MessageReaction, user: User): Promise<void>;
    handleReactionRemove(reaction: MessageReaction, user: User): Promise<void>;
    private handleGuildCreate;
    private handleInteractionCreate;
    private onReady;
}
declare function startDiscord(runtime: IAgentRuntime): DiscordClient;
declare const DiscordClientInterface: Client$1;

export { DiscordClient, DiscordClientInterface, startDiscord };
