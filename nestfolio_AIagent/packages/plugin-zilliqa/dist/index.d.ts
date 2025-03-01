import { Plugin } from '@elizaos/core';

declare function zilliqaPlugin(getSetting: (key: string) => string | undefined): Promise<Plugin>;

export { zilliqaPlugin as default, zilliqaPlugin };
