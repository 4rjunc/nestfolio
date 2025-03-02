import { z } from 'zod';
import { Provider, IAgentRuntime, Action, Memory, State, HandlerCallback, Evaluator, Service, Client, Plugin, Character, ActionExample, EvaluationExample } from '@elizaos/core';
import { interfaces, Container } from 'inversify';

/**
 * Factory Symbols used in the library
 */
declare const FACTORIES: {
    PluginFactory: symbol;
};

declare const symbols_FACTORIES: typeof FACTORIES;
declare namespace symbols {
  export { symbols_FACTORIES as FACTORIES };
}

/**
 * Interface of Injectable Provider
 */
interface InjectableProvider<T> extends Provider {
    /**
     * Get the instance of the provider related to Eliza runtime
     * @param runtime The runtime object from Eliza framework
     */
    getInstance(runtime: IAgentRuntime): Promise<T>;
}
/**
 * Action options
 */
type ActionOptions<T> = Pick<Action, "name" | "similes" | "description" | "examples" | "suppressInitialMessage"> & {
    contentClass: ContentClass<T>;
    template?: string;
    contentSchema?: z.ZodSchema<T>;
};
/**
 * Interface of Injectable Action
 */
interface InjectableAction<T> extends Action {
    /**
     * Execute the action
     * @param content The content from processMessages
     * @param callback The callback function to pass the result to Eliza runtime
     */
    execute(content: T | null, runtime: IAgentRuntime, message: Memory, state?: State, callback?: HandlerCallback): Promise<unknown | null>;
}
/**
 * Evaluator options
 */
type EvaluatorOptions = Pick<Evaluator, "name" | "similes" | "description" | "examples" | "alwaysRun">;
/**
 * Interface of Injectable Evaluator
 */
type InjectableEvaluator = Evaluator;
/**
 * The Class of Injectable Object
 */
type InjectableObjectClass<T, Args extends any[] = any[]> = new (...args: Args) => T;
/**
 * The Class of Injectable Provider
 */
type InjectableProviderClass<T = any, Args extends any[] = any[]> = InjectableObjectClass<InjectableProvider<T> | Provider, Args>;
/**
 * The Class of Injectable Action
 */
type InjectableActionClass<T = any, Args extends any[] = any[]> = InjectableObjectClass<InjectableAction<T> | Action, Args>;
/**
 * The Class of Injectable Evaluator
 */
type InjectableEvaluatorClass<Args extends any[] = any[]> = InjectableObjectClass<InjectableEvaluator | Evaluator, Args>;
/**
 * The Class of Injectable Service
 */
type InjectableServiceClass<Args extends any[] = any[]> = InjectableObjectClass<Service, Args>;
/**
 * The Class of Injectable Client
 */
type InjectableClientClass<Args extends any[] = any[]> = InjectableObjectClass<Client, Args>;
/**
 * Plugin options
 */
type PluginOptions = Pick<Plugin, "name" | "description"> & {
    /** Optional actions */
    actions?: (Action | InjectableActionClass)[];
    /** Optional providers */
    providers?: (Provider | InjectableProviderClass)[];
    /** Optional evaluators */
    evaluators?: (Evaluator | InjectableEvaluatorClass)[];
    /** Optional services */
    services?: (Service | InjectableServiceClass)[];
    /** Optional clients */
    clients?: (Client | InjectableClientClass)[];
};
/**
 * Factory type for creating a plugin
 */
type PluginFactory = (opts: PluginOptions) => Promise<Plugin>;
interface ContentPropertyDescription {
    description: string;
    examples?: string[];
}

type ContentClass<T> = {
    new (...args: unknown[]): T;
    prototype: T;
};
interface ContentPropertyConfig extends ContentPropertyDescription {
    schema: z.ZodType;
}
declare function property(config: ContentPropertyConfig): (target: object, propertyKey: string) => void;
/**
 * Create a Zod schema from a class decorated with @property
 *
 * @param cls
 * @returns
 */
declare function createZodSchema<T>(cls: ContentClass<T>): z.ZodType<T>;
/**
 * Load the description of each property from a class decorated with @property
 *
 * @param cls
 * @returns
 */
declare function loadPropertyDescriptions<T>(cls: ContentClass<T>): Record<string, ContentPropertyDescription>;

/**
 * Create a plugin factory
 */
declare function createPlugin(ctx: interfaces.Context): PluginFactory;

/**
 * Normalize a character by creating all plugins from the character's plugin list using the PluginFactory
 * @param character
 */
declare function normalizeCharacter(character: Character): Promise<Character>;

/**
 * build the content output template
 * @param properties The properties of the content
 * @param schema The Zod schema of the content
 */
declare function buildContentOutputTemplate(actionName: string, actionDesc: string, properties: Record<string, ContentPropertyDescription>, schema: z.ZodType<any>): string;
/**
 * Convert a Zod schema to JSON
 * @param schema Zod schema
 * @returns JSON string
 */
declare function zodSchemaToJson(schema: z.ZodType<any>): string;

declare const globalContainer: Container;

/**
 * Base abstract class for injectable actions
 */
declare abstract class BaseInjectableAction<T> implements InjectableAction<T> {
    name: string;
    similes: string[];
    description: string;
    examples: ActionExample[][];
    suppressInitialMessage: boolean;
    /**
     * The content class for the action
     */
    protected readonly contentClass: ContentClass<T>;
    /**
     * Optional template for the action, if not provided, it will be generated from the content class
     */
    protected readonly template: string;
    /**
     * Optional content schema for the action, if not provided, it will be generated from the content class
     */
    protected readonly contentSchema: z.ZodSchema<T>;
    /**
     * Constructor for the base injectable action
     */
    constructor(opts: ActionOptions<T>);
    /**
     * Abstract method to execute the action
     * @param content The content object
     * @param callback The callback function to pass the result to Eliza runtime
     */
    abstract execute(content: T | null, runtime: IAgentRuntime, message: Memory, state?: State, callback?: HandlerCallback): Promise<unknown | null>;
    /**
     * Default implementation of the validate method
     * You can override this method to add custom validation logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     * @returns The validation result
     */
    validate(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean>;
    /**
     * Default implementation of the preparation of action context
     * You can override this method to add custom logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     */
    protected prepareActionContext(runtime: IAgentRuntime, message: Memory, state?: State): Promise<string>;
    /**
     * Default method for processing messages
     * You can override this method to add custom logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     * @returns The generated content from AI based on the message
     */
    protected processMessages(runtime: IAgentRuntime, message: Memory, state: State): Promise<T | null>;
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
    handler(runtime: IAgentRuntime, message: Memory, state?: State, _options?: Record<string, unknown>, callback?: HandlerCallback): Promise<unknown | null>;
}

/**
 * Base abstract class for injectable actions
 */
declare abstract class BaseInjectableEvaluator implements InjectableEvaluator {
    alwaysRun: boolean;
    name: string;
    similes: string[];
    description: string;
    examples: EvaluationExample[];
    /**
     * Constructor for the base injectable action
     */
    constructor(opts: EvaluatorOptions);
    /**
     * Default implementation of the validate method
     * You can override this method to add custom validation logic
     *
     * @param runtime The runtime object from Eliza framework
     * @param message The message object from Eliza framework
     * @param state The state object from Eliza framework
     * @returns The validation result
     */
    validate(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean>;
    /**
     * Handler for the evaluator
     */
    abstract handler(runtime: IAgentRuntime, message: Memory, state?: State, options?: Record<string, unknown>, callback?: HandlerCallback): Promise<unknown>;
}

export { type ActionOptions, BaseInjectableAction, BaseInjectableEvaluator, type ContentClass, type ContentPropertyDescription, type EvaluatorOptions, type InjectableAction, type InjectableActionClass, type InjectableClientClass, type InjectableEvaluator, type InjectableEvaluatorClass, type InjectableObjectClass, type InjectableProvider, type InjectableProviderClass, type InjectableServiceClass, type PluginFactory, type PluginOptions, buildContentOutputTemplate, createPlugin, createZodSchema, globalContainer, loadPropertyDescriptions, normalizeCharacter, property, symbols, zodSchemaToJson };
