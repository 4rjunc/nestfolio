import { Action, Provider, IAgentRuntime, Memory, State, Plugin } from '@elizaos/core';

declare const generateMusic: Action;

declare const extendMusic: Action;

interface UdioSamplerOptions {
    seed: number;
    audio_conditioning_path?: string;
    audio_conditioning_song_id?: string;
    audio_conditioning_type?: 'continuation';
    crop_start_time?: number;
}
interface UdioSong {
    id: string;
    title: string;
    song_path: string;
    finished: boolean;
}
interface UdioGenerateResponse {
    track_ids: string[];
}

interface UdioConfig {
    authToken: string;
    baseUrl?: string;
}
declare class UdioProvider implements Provider {
    private authToken;
    private baseUrl;
    static get(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<UdioProvider>;
    constructor(config: UdioConfig);
    get(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<UdioProvider>;
    makeRequest(url: string, method: string, data?: Record<string, unknown>): Promise<any>;
    generateSong(prompt: string, samplerOptions: UdioSamplerOptions, customLyrics?: string): Promise<UdioGenerateResponse>;
    checkSongStatus(songIds: string[]): Promise<{
        songs: UdioSong[];
    }>;
}

declare const udioPlugin: Plugin;

export { extendMusic as ExtendMusic, generateMusic as GenerateMusic, UdioProvider, udioPlugin as default, udioPlugin };
