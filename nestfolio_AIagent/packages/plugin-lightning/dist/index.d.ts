import { IAgentRuntime, Provider, Memory, State, Plugin } from '@elizaos/core';
import { GetIdentityResult, GetChannelsResult, CreateInvoiceResult, PayResult } from 'astra-lightning';

type CreateInvoiceArgs = {
    /** CLTV Delta */
    cltv_delta?: number;
    /** Invoice Description */
    description?: string;
    /** Hashed Description of Payment Hex String */
    description_hash?: string;
    /** Expires At ISO 8601 Date */
    expires_at?: string;
    /** Use Blinded Paths For Inbound Routes */
    is_encrypting_routes?: boolean;
    /** Is Fallback Address Included */
    is_fallback_included?: boolean;
    /** Is Fallback Address Nested */
    is_fallback_nested?: boolean;
    /** Invoice Includes Private Channels */
    is_including_private_channels?: boolean;
    /** Payment Preimage Hex String */
    secret?: string;
    /** Millitokens */
    mtokens?: string;
    routes?: any;
    /** Tokens */
    tokens?: number;
    asset_id?: string;
    peer_pubkey?: string;
    tpr?: any;
};
type PayArgs = {
    /** Pay Through Specific Final Hop Public Key Hex */
    incoming_peer?: string;
    /** Maximum Additional Fee Tokens To Pay */
    max_fee?: number;
    /** Maximum Fee Millitokens to Pay */
    max_fee_mtokens?: string;
    /** Maximum Millitokens For A Multi-Path Path */
    max_path_mtokens?: string;
    /** Maximum Simultaneous Paths */
    max_paths?: number;
    /** Max CLTV Timeout */
    max_timeout_height?: number;
    messages?: {
        /** Message Type number */
        type: string;
        /** Message Raw Value Hex Encoded */
        value: string;
    }[];
    /** Millitokens to Pay */
    mtokens?: string;
    /** Pay Through Outbound Standard Channel Id */
    outgoing_channel?: string;
    /** Pay Out of Outgoing Channel Ids */
    outgoing_channels?: string[];
    path?: {
        /** Payment Hash Hex */
        id: string;
        routes: {
            /** Total Fee Tokens To Pay */
            fee: number;
            /** Total Fee Millitokens To Pay */
            fee_mtokens: string;
            hops: {
                /** Standard Format Channel Id */
                channel: string;
                /** Channel Capacity Tokens */
                channel_capacity: number;
                /** Fee */
                fee: number;
                /** Fee Millitokens */
                fee_mtokens: string;
                /** Forward Tokens */
                forward: number;
                /** Forward Millitokens */
                forward_mtokens: string;
                /** Public Key Hex */
                public_key?: string;
                /** Timeout Block Height */
                timeout: number;
            }[];
            messages?: {
                /** Message Type number */
                type: string;
                /** Message Raw Value Hex Encoded */
                value: string;
            }[];
            /** Total Millitokens To Pay */
            mtokens: string;
            /** Payment Identifier Hex */
            payment?: string;
            /** Expiration Block Height */
            timeout: number;
            /** Total Tokens To Pay */
            tokens: number;
        }[];
    };
    /** Time to Spend Finding a Route Milliseconds */
    pathfinding_timeout?: number;
    /** BOLT 11 Payment Request */
    request?: string;
    /** Total Tokens To Pay to Payment Request */
    tokens?: number;
};

declare class LightningProvider {
    private lndClient;
    constructor(cert: string, macaroon: string, socket: string);
    getLndIdentity(): Promise<GetIdentityResult>;
    getLndChannel(): Promise<GetChannelsResult>;
    createInvoice(createInvoiceArgs: CreateInvoiceArgs): Promise<CreateInvoiceResult>;
    payInvoice(payInvoiceArgs: PayArgs): Promise<PayResult>;
}
declare const initLightningProvider: (runtime: IAgentRuntime) => Promise<LightningProvider>;
declare const lndProvider: Provider;

declare const createInvoiceTemplate = "You are an AI assistant specialized in processing requests to create Lightning Network invoices. Your task is to extract specific information from user messages and format it into a structured JSON response.\n\nFirst, review the recent messages from the conversation:\n\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nYour goal is to extract the following information for the invoice creation:\n1. Tokens or Millitokens (amount to request).\n2. Description (optional, a user-provided note about the invoice).\n\nBefore providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:\n\n1. Identify the relevant information from the user's message:\n   - Quote the part of the message mentioning the amount (tokens or millitokens).\n   - Quote the part mentioning the description (if provided).\n\n2. Validate each piece of information:\n   - Tokens or millitokens: Ensure at least one is provided and can be parsed as a valid number.\n   - Description: This field is optional; if present, it should be a string.\n\n3. If any required information is missing or invalid, prepare an appropriate error message.\n\n4. If all information is valid, summarize your findings.\n\nRespond with a JSON markdown block containing only the extracted values. All fields are required:\n\n```json\n{\n    \"description\"?: string;\n    /** Expires At ISO 8601 Date */\n    \"expires_at\"?: string;\n    \"tokens\": \"<Tokens Number | null>\"\n}\n```\n\nIf the input is valid, provide the structured JSON response. Otherwise, output an error message describing what is missing or invalid.\n\nNow, process the user's request and provide your response.\n";

declare class CreateInvoiceAction {
    private lightningProvider;
    constructor(lightningProvider: LightningProvider);
    createInvoice(params: CreateInvoiceArgs): Promise<CreateInvoiceResult>;
}
declare const createInvoiceAction: {
    name: string;
    description: string;
    handler: (runtime: IAgentRuntime, _message: Memory, state: State, _options: Record<string, unknown>, callback?: (response: {
        text: string;
        content?: {
            success: boolean;
            invoice?: string;
        };
    }) => void) => Promise<boolean>;
    template: string;
    validate: (runtime: IAgentRuntime) => Promise<boolean>;
    examples: {
        user: string;
        content: {
            text: string;
            action: string;
        };
    }[][];
    similes: string[];
};

declare const lightningPlugin: Plugin;

export { CreateInvoiceAction, type CreateInvoiceArgs, LightningProvider, type PayArgs, createInvoiceAction, createInvoiceTemplate, lightningPlugin as default, initLightningProvider, lightningPlugin, lndProvider };
