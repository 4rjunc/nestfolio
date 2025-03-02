import { Plugin } from '@elizaos/core';

interface GitBookResponse {
    answer?: {
        text: string;
    };
    error?: string;
}
interface GitBookKeywords {
    projectTerms?: string[];
    generalQueries?: string[];
}
interface GitBookClientConfig {
    keywords?: GitBookKeywords;
    documentTriggers?: string[];
}

declare const gitbookPlugin: Plugin;

export { type GitBookClientConfig, type GitBookKeywords, type GitBookResponse, gitbookPlugin as default, gitbookPlugin };
