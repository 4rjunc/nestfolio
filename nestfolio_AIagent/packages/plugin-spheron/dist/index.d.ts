import { Content, IAgentRuntime, Plugin } from '@elizaos/core';
import { z } from 'zod';
import { SpheronSDK } from '@spheron/protocol-sdk';

interface SpheronComputeConfig {
    name: string;
    image: string;
    replicas?: number;
    ports?: Array<{
        containerPort: number;
        servicePort: number;
    }>;
    env?: Array<{
        name: string;
        value: string;
    }>;
    computeResources?: {
        cpu: number;
        memory: string;
        storage: string;
        gpu?: {
            count: number;
            model: string;
        };
    };
    duration?: string;
    mode?: string;
    token?: string;
}
interface EscrowContent extends Content {
    token: string;
    amount: number;
    operation: "deposit" | "withdraw" | "check";
}
interface DeploymentContent extends Content {
    operation: "create" | "update" | "close";
    template?: string;
    customizations?: Customizations;
    leaseId?: string;
}
interface Customizations {
    cpu: boolean;
    resources: {
        cpu: number;
        memory: string;
        storage: string;
        gpu: number;
        gpu_model: string;
    };
    duration: string;
    token: string;
    template?: {
        heuristMinerAddress: string;
    };
}
interface TokenInfo {
    name: string;
    symbol: string;
    decimal: number;
}
interface BalanceInfo {
    lockedBalance: string;
    unlockedBalance: string;
    token: TokenInfo;
}
interface DeploymentDetails {
    services: {
        [key: string]: {
            name: string;
            available: number;
            total: number;
            observed_generation: number;
            replicas: number;
            updated_replicas: number;
            ready_replicas: number;
            available_replicas: number;
            container_statuses: any[];
            creationTimestamp: string;
        };
    };
    forwarded_ports: {
        [key: string]: Array<{
            host: string;
            port: number;
            externalPort: number;
            proto: string;
            name: string;
        }>;
    };
    ips: null | object;
}

declare const spheronEnvSchema: z.ZodObject<{
    PRIVATE_KEY: z.ZodString;
    PROVIDER_PROXY_URL: z.ZodString;
    WALLET_ADDRESS: z.ZodString;
    SPHERON_PROXY_PORT: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    PRIVATE_KEY?: string;
    PROVIDER_PROXY_URL?: string;
    WALLET_ADDRESS?: string;
    SPHERON_PROXY_PORT?: string;
}, {
    PRIVATE_KEY?: string;
    PROVIDER_PROXY_URL?: string;
    WALLET_ADDRESS?: string;
    SPHERON_PROXY_PORT?: string;
}>;
declare const requiredEnvVars: readonly ["SPHERON_PRIVATE_KEY", "SPHERON_WALLET_ADDRESS", "SPHERON_PROVIDER_PROXY_URL"];
type SpheronConfig = z.infer<typeof spheronEnvSchema>;
declare function validateSpheronConfig(runtime: IAgentRuntime): Promise<SpheronConfig>;

declare const getSDKInstance: (runtime: IAgentRuntime) => Promise<SpheronSDK>;
declare const getUserBalance: (runtime: IAgentRuntime, token: string, walletAddress?: string) => Promise<BalanceInfo>;
declare const depositBalance: (runtime: IAgentRuntime, token: string, amount: number) => Promise<unknown>;
declare const withdrawBalance: (runtime: IAgentRuntime, token: string, amount: number) => Promise<unknown>;
declare const startDeployment: (runtime: IAgentRuntime, computeConfig: SpheronComputeConfig) => Promise<any>;
declare const updateDeployment: (runtime: IAgentRuntime, leaseId: string, computeConfig: SpheronComputeConfig) => Promise<any>;
declare const createOrder: (runtime: IAgentRuntime, iclYaml: string) => Promise<{
    leaseId: string;
    transaction: any;
}>;
declare const updateOrder: (runtime: IAgentRuntime, leaseId: string, iclYaml: string) => Promise<{
    providerAddress: string;
}>;
declare const getDeployment: (runtime: IAgentRuntime, leaseId: string) => Promise<DeploymentDetails>;
declare const closeDeployment: (runtime: IAgentRuntime, leaseId: string) => Promise<unknown>;
declare function getDeploymentStatus(runtime: IAgentRuntime, deploymentId: string): Promise<boolean>;
declare function generateICLYaml(config: SpheronComputeConfig): string;

declare const CONFIG: {
    SUPPORTED_TOKENS: {
        readonly USDT: "USDT";
        readonly USDC: "USDC";
        readonly DAI: "DAI";
        readonly WETH: "WETH";
        readonly CST: "CST";
    };
    DEPLOYMENT_CONFIGS: {
        readonly DEFAULT_PROVIDER_PROXY_URL: "http://localhost:3040";
        readonly NETWORK: "testnet";
    };
    LEASE_STATES: {
        readonly ACTIVE: "ACTIVE";
        readonly TERMINATED: "TERMINATED";
    };
};
declare const spheronPlugin: Plugin;

export { type BalanceInfo, CONFIG, type Customizations, type DeploymentContent, type DeploymentDetails, type EscrowContent, type SpheronComputeConfig, type SpheronConfig, type TokenInfo, closeDeployment, createOrder, spheronPlugin as default, depositBalance, generateICLYaml, getDeployment, getDeploymentStatus, getSDKInstance, getUserBalance, requiredEnvVars, spheronEnvSchema, spheronPlugin, startDeployment, updateDeployment, updateOrder, validateSpheronConfig, withdrawBalance };
