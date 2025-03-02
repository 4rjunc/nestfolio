import { Plugin, Provider } from '@elizaos/core';

declare const sgxPlugin: Plugin;

interface SgxAttestation {
    quote: string;
    timestamp: number;
}

declare class SgxAttestationProvider {
    private readonly SGX_QUOTE_MAX_SIZE;
    private readonly SGX_TARGET_INFO_SIZE;
    private readonly MY_TARGET_INFO_PATH;
    private readonly TARGET_INFO_PATH;
    private readonly USER_REPORT_DATA_PATH;
    private readonly QUOTE_PATH;
    generateAttestation(reportData: string): Promise<SgxAttestation>;
    generateQuoteByGramine(rawUserReport: Buffer): Promise<string>;
}
declare const sgxAttestationProvider: Provider;

export { type SgxAttestation, SgxAttestationProvider, sgxPlugin as default, sgxAttestationProvider, sgxPlugin };
