import { Plugin, Service, ServiceType, IAgentRuntime } from '@elizaos/core';

interface Device {
    name: string;
    index: number;
    vibrate?: (strength: number) => Promise<void>;
    rotate?: (strength: number) => Promise<void>;
    stop?: () => Promise<void>;
    battery?: () => Promise<number>;
    id?: number;
}
interface IIntifaceService extends Service {
    vibrate(strength: number, duration: number): Promise<void>;
    rotate?(strength: number, duration: number): Promise<void>;
    getBatteryLevel?(): Promise<number>;
    isConnected(): boolean;
    getDevices(): Device[];
}
declare class IntifaceService extends Service implements IIntifaceService {
    static serviceType: ServiceType;
    private client;
    private connected;
    private devices;
    private vibrateQueue;
    private isProcessingQueue;
    private config;
    private maxVibrationIntensity;
    private rampUpAndDown;
    private rampSteps;
    private preferredDeviceName;
    constructor();
    private cleanup;
    getInstance(): IIntifaceService;
    initialize(runtime: IAgentRuntime): Promise<void>;
    connect(): Promise<void>;
    private scanAndGrabDevices;
    private ensureDeviceAvailable;
    disconnect(): Promise<void>;
    private handleDeviceAdded;
    private handleDeviceRemoved;
    getDevices(): Device[];
    isConnected(): boolean;
    private addToVibrateQueue;
    private processVibrateQueue;
    private handleVibrate;
    vibrate(strength: number, duration: number): Promise<void>;
    getBatteryLevel(): Promise<number>;
    rotate(strength: number, duration: number): Promise<void>;
    private rampedRotate;
}
declare const intifacePlugin: Plugin;

export { type IIntifaceService, IntifaceService, intifacePlugin as default, intifacePlugin };
