import { Plugin } from '@elizaos/core';

declare function createGoatPlugin(getSetting: (key: string) => string | undefined): Promise<Plugin>;

export { createGoatPlugin as default };
