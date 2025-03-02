var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/symbols.ts
var symbols_exports = {};
__export(symbols_exports, {
  FACTORIES: () => FACTORIES
});
var FACTORIES = {
  PluginFactory: Symbol.for("PluginFactory")
};

// src/decorators/content.decorators.ts
import "reflect-metadata";
import { z } from "zod";
var CONTENT_METADATA_KEY = "content:properties";
function property(config) {
  return (target, propertyKey) => {
    const properties = Reflect.getMetadata(CONTENT_METADATA_KEY, target) || {};
    properties[propertyKey] = config;
    Reflect.defineMetadata(CONTENT_METADATA_KEY, properties, target);
  };
}
__name(property, "property");
function createZodSchema(cls) {
  const properties = Reflect.getMetadata(CONTENT_METADATA_KEY, cls.prototype) || {};
  const schemaProperties = Object.entries(properties).reduce((acc, [key, { schema }]) => {
    acc[key] = schema;
    return acc;
  }, {});
  return z.object(schemaProperties);
}
__name(createZodSchema, "createZodSchema");
function loadPropertyDescriptions(cls) {
  const properties = Reflect.getMetadata(CONTENT_METADATA_KEY, cls.prototype) || {};
  return Object.entries(properties).reduce((acc, [key, { description, examples }]) => {
    acc[key] = {
      description,
      examples
    };
    return acc;
  }, {});
}
__name(loadPropertyDescriptions, "loadPropertyDescriptions");

// src/factories/plugin.ts
import { elizaLogger } from "@elizaos/core";
async function getInstanceFromContainer(ctx, item, type) {
  if (typeof item === "function") {
    try {
      return await ctx.container.getAsync(item);
    } catch (e) {
      elizaLogger.error(`Error normalizing ${type}: ${item.name}`, e.message);
      return void 0;
    }
  }
  return item;
}
__name(getInstanceFromContainer, "getInstanceFromContainer");
function createPlugin(ctx) {
  return async (opts) => {
    const plugin = {
      name: opts.name,
      description: opts.description
    };
    if (typeof opts.providers !== "undefined") {
      plugin.providers = (await Promise.all(opts.providers.map((provider) => getInstanceFromContainer(ctx, provider, "provider")))).filter(Boolean);
    }
    if (typeof opts.actions !== "undefined") {
      plugin.actions = (await Promise.all(opts.actions.map((action) => getInstanceFromContainer(ctx, action, "action")))).filter(Boolean);
    }
    if (typeof opts.evaluators !== "undefined") {
      plugin.evaluators = (await Promise.all(opts.evaluators.map((evaluator) => getInstanceFromContainer(ctx, evaluator, "evaluator")))).filter(Boolean);
    }
    if (typeof opts.services !== "undefined") {
      plugin.services = await Promise.all(opts.services.map((service) => getInstanceFromContainer(ctx, service, "service")));
    }
    if (typeof opts.clients !== "undefined") {
      plugin.clients = await Promise.all(opts.clients.map((client) => getInstanceFromContainer(ctx, client, "client")));
    }
    return plugin;
  };
}
__name(createPlugin, "createPlugin");

// src/factories/charactor.ts
import { elizaLogger as elizaLogger2 } from "@elizaos/core";

// src/di.ts
import { Container } from "inversify";
var globalContainer = new Container();
globalContainer.bind(FACTORIES.PluginFactory).toFactory(createPlugin);

// src/factories/charactor.ts
async function normalizeCharacter(character) {
  const createPlugin2 = globalContainer.get(FACTORIES.PluginFactory);
  const normalizePlugin = /* @__PURE__ */ __name(async (plugin) => {
    if (typeof plugin?.name === "string" && typeof plugin?.description === "string") {
      try {
        const normalized = await createPlugin2(plugin);
        elizaLogger2.info("Normalized plugin:", normalized.name);
        return normalized;
      } catch (e) {
        elizaLogger2.error(`Error normalizing plugin: ${plugin.name}`, e.message);
      }
    }
    return plugin;
  }, "normalizePlugin");
  let plugins = [];
  if (character.plugins?.length > 0) {
    const normalizedPlugins = await Promise.all(character.plugins.map(normalizePlugin));
    const validPlugins = normalizedPlugins.filter((plugin) => plugin !== void 0);
    if (validPlugins.length !== character.plugins.length) {
      elizaLogger2.warn(`Some plugins failed to normalize: ${character.plugins.length - validPlugins.length} failed`);
    }
    plugins = validPlugins;
  }
  return Object.assign({}, character, {
    plugins
  });
}
__name(normalizeCharacter, "normalizeCharacter");

// src/templates.ts
import { z as z2 } from "zod";
function buildContentOutputTemplate(actionName, actionDesc, properties, schema) {
  let propDesc = "";
  Object.entries(properties).forEach(([key, { description, examples }]) => {
    propDesc += `- Field **"${key}"**: ${description}.`;
    if (examples?.length > 0) {
      propDesc += " Examples or Rules for this field:\n";
    } else {
      propDesc += "\n";
    }
    examples?.forEach((example, index) => {
      propDesc += `    ${index + 1}. ${example}
`;
    });
  });
  return `Perform the action: "${actionName}".
Action description is "${actionDesc}".

### TASK: Extract the following details about the requested action

${propDesc}

Use null for any values that cannot be determined.

Respond with a JSON markdown block containing only the extracted values with this structure:

\`\`\`json
${zodSchemaToJson(schema)}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
}
__name(buildContentOutputTemplate, "buildContentOutputTemplate");
function zodSchemaToJson(schema) {
  if (schema instanceof z2.ZodObject) {
    const shape = schema.shape;
    const properties = Object.entries(shape).map(([key, value]) => {
      return `"${key}": ${zodTypeToJson(value)}`;
    });
    return `{
${properties.join(",\n")}
}`;
  }
  return "";
}
__name(zodSchemaToJson, "zodSchemaToJson");
function zodTypeToJson(schema) {
  if (schema instanceof z2.ZodNullable || schema instanceof z2.ZodOptional) {
    return `${zodTypeToJson(schema._def.innerType)} | null`;
  }
  if (schema instanceof z2.ZodUnion) {
    return schema._def.options.map(zodTypeToJson).join(" | ");
  }
  if (schema instanceof z2.ZodString) {
    return "string";
  }
  if (schema instanceof z2.ZodNumber) {
    return "number";
  }
  if (schema instanceof z2.ZodBoolean) {
    return "boolean";
  }
  if (schema instanceof z2.ZodArray) {
    return `${zodTypeToJson(schema._def.type)}[]`;
  }
  if (schema instanceof z2.ZodObject) {
    return zodSchemaToJson(schema);
  }
  return "any";
}
__name(zodTypeToJson, "zodTypeToJson");

// src/actions/baseInjectableAction.ts
import { injectable, unmanaged } from "inversify";
import { composeContext, elizaLogger as elizaLogger3, generateObject, ModelClass } from "@elizaos/core";
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate, "_ts_decorate");
function _ts_metadata(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata, "_ts_metadata");
function _ts_param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param, "_ts_param");
var BaseInjectableAction = class {
  static {
    __name(this, "BaseInjectableAction");
  }
  // -------- Properties --------
  name;
  similes;
  description;
  examples;
  suppressInitialMessage;
  /**
   * The content class for the action
   */
  contentClass;
  /**
   * Optional template for the action, if not provided, it will be generated from the content class
   */
  template;
  /**
   * Optional content schema for the action, if not provided, it will be generated from the content class
   */
  contentSchema;
  /**
   * Constructor for the base injectable action
   */
  constructor(opts) {
    this.name = opts.name;
    this.similes = opts.similes;
    this.description = opts.description;
    this.examples = opts.examples;
    this.suppressInitialMessage = opts.suppressInitialMessage ?? false;
    this.contentClass = opts.contentClass;
    this.template = opts.template;
    this.contentSchema = opts.contentSchema;
    if (this.contentClass !== void 0) {
      if (this.contentSchema === void 0) {
        this.contentSchema = createZodSchema(this.contentClass);
      }
      if (this.template === void 0) {
        const properties = loadPropertyDescriptions(this.contentClass);
        this.template = buildContentOutputTemplate(this.name, this.description, properties, this.contentSchema);
      }
    }
  }
  // -------- Implemented methods for Eliza runtime --------
  /**
   * Default implementation of the validate method
   * You can override this method to add custom validation logic
   *
   * @param runtime The runtime object from Eliza framework
   * @param message The message object from Eliza framework
   * @param state The state object from Eliza framework
   * @returns The validation result
   */
  async validate(_runtime, _message, _state) {
    return true;
  }
  /**
   * Default implementation of the preparation of action context
   * You can override this method to add custom logic
   *
   * @param runtime The runtime object from Eliza framework
   * @param message The message object from Eliza framework
   * @param state The state object from Eliza framework
   */
  async prepareActionContext(runtime, message, state) {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    return composeContext({
      state: currentState,
      template: this.template
    });
  }
  /**
   * Default method for processing messages
   * You can override this method to add custom logic
   *
   * @param runtime The runtime object from Eliza framework
   * @param message The message object from Eliza framework
   * @param state The state object from Eliza framework
   * @returns The generated content from AI based on the message
   */
  async processMessages(runtime, message, state) {
    const actionContext = await this.prepareActionContext(runtime, message, state);
    if (!actionContext) {
      elizaLogger3.error("Failed to prepare action context");
      return null;
    }
    const resourceDetails = await generateObject({
      runtime,
      context: actionContext,
      modelClass: ModelClass.SMALL,
      schema: this.contentSchema
    });
    elizaLogger3.debug("Response: ", resourceDetails.object);
    const parsedObj = await this.contentSchema.safeParseAsync(resourceDetails.object);
    if (!parsedObj.success) {
      elizaLogger3.error("Failed to parse content: ", JSON.stringify(parsedObj.error?.flatten()));
      return null;
    }
    return parsedObj.data;
  }
  /**
   * Default Handler function type for processing messages
   * You can override this method to add custom logic
   *
   * @param runtime The runtime object from Eliza framework
   * @param message The message object from Eliza framework
   * @param state The state object from Eliza framework
   * @param options The options object from Eliza framework
   * @param callback The callback function to pass the result to Eliza runtime
   */
  async handler(runtime, message, state, _options, callback) {
    let content;
    try {
      content = await this.processMessages(runtime, message, state);
    } catch (err) {
      elizaLogger3.error("Error in processing messages:", err.message);
      if (callback) {
        await callback?.({
          text: `Unable to process transfer request. Invalid content: ${err.message}`,
          content: {
            error: "Invalid content"
          }
        });
      }
      return null;
    }
    try {
      return await this.execute(content, runtime, message, state, callback);
    } catch (err) {
      elizaLogger3.error("Error in executing action:", err.message);
    }
  }
};
BaseInjectableAction = _ts_decorate([
  injectable(),
  _ts_param(0, unmanaged()),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof ActionOptions === "undefined" ? Object : ActionOptions
  ])
], BaseInjectableAction);

// src/evaluators/baseInjectableEvaluator.ts
import { injectable as injectable2, unmanaged as unmanaged2 } from "inversify";
function _ts_decorate2(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate2, "_ts_decorate");
function _ts_metadata2(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata2, "_ts_metadata");
function _ts_param2(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param2, "_ts_param");
var BaseInjectableEvaluator = class {
  static {
    __name(this, "BaseInjectableEvaluator");
  }
  // -------- Properties --------
  alwaysRun;
  name;
  similes;
  description;
  examples;
  /**
   * Constructor for the base injectable action
   */
  constructor(opts) {
    this.name = opts.name;
    this.similes = opts.similes;
    this.description = opts.description;
    this.examples = opts.examples;
    this.alwaysRun = opts.alwaysRun ?? false;
  }
  /**
   * Default implementation of the validate method
   * You can override this method to add custom validation logic
   *
   * @param runtime The runtime object from Eliza framework
   * @param message The message object from Eliza framework
   * @param state The state object from Eliza framework
   * @returns The validation result
   */
  async validate(_runtime, _message, _state) {
    return true;
  }
};
BaseInjectableEvaluator = _ts_decorate2([
  injectable2(),
  _ts_param2(0, unmanaged2()),
  _ts_metadata2("design:type", Function),
  _ts_metadata2("design:paramtypes", [
    typeof EvaluatorOptions === "undefined" ? Object : EvaluatorOptions
  ])
], BaseInjectableEvaluator);
export {
  BaseInjectableAction,
  BaseInjectableEvaluator,
  buildContentOutputTemplate,
  createPlugin,
  createZodSchema,
  globalContainer,
  loadPropertyDescriptions,
  normalizeCharacter,
  property,
  symbols_exports as symbols,
  zodSchemaToJson
};
//# sourceMappingURL=index.js.map