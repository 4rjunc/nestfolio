import { Action, Plugin } from '@elizaos/core';

declare const startAnyone: Action;

declare const stopAnyone: Action;

declare const index_startAnyone: typeof startAnyone;
declare const index_stopAnyone: typeof stopAnyone;
declare namespace index {
  export { index_startAnyone as startAnyone, index_stopAnyone as stopAnyone };
}

declare const anyonePlugin: Plugin;

export { index as actions, anyonePlugin };
