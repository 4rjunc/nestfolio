// src/index.ts
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";

// ../../node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check, params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      if (!check(data)) {
        const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// src/environment.ts
var ENV = "production";
var ANKR_ENDPOINTS = {
  production: {
    multichain: "https://rpc.ankr.com/multichain/"
  }
};
var ankrEnvSchema = z.object({
  // API Configuration
  ANKR_ENV: z.enum(["production", "staging"]).default("production"),
  ANKR_WALLET: z.string().min(1, "ANKR_WALLET is required"),
  // Request Configuration
  ANKR_MAX_RETRIES: z.string().transform(Number).default("3"),
  ANKR_RETRY_DELAY: z.string().transform(Number).default("1000"),
  ANKR_TIMEOUT: z.string().transform(Number).default("5000"),
  // Logging Configuration
  ANKR_GRANULAR_LOG: z.boolean().default(true),
  ANKR_LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  // Runtime Configuration
  ANKR_RUNTIME_CHECK_MODE: z.boolean().default(false),
  ANKR_SPASH: z.boolean().default(false)
});
function getConfig(env = ENV || process.env.ANKR_ENV) {
  ENV = env || "production";
  return {
    ANKR_ENV: env || "production",
    ANKR_WALLET: process.env.ANKR_WALLET || "",
    ANKR_MAX_RETRIES: Number(process.env.ANKR_MAX_RETRIES || "3"),
    ANKR_RETRY_DELAY: Number(process.env.ANKR_RETRY_DELAY || "1000"),
    ANKR_TIMEOUT: Number(process.env.ANKR_TIMEOUT || "5000"),
    ANKR_GRANULAR_LOG: process.env.ANKR_GRANULAR_LOG === "true" || false,
    ANKR_LOG_LEVEL: process.env.ANKR_LOG_LEVEL || "info",
    ANKR_RUNTIME_CHECK_MODE: process.env.RUNTIME_CHECK_MODE === "true" || false,
    ANKR_SPASH: process.env.ANKR_SPASH === "true" || false
  };
}
async function validateankrConfig(runtime) {
  try {
    const envConfig = getConfig(
      runtime.getSetting("ankr_ENV") ?? void 0
    );
    const config14 = {
      ANKR_ENV: process.env.ANKR_ENV || runtime.getSetting("ANKR_ENV") || envConfig.ANKR_ENV,
      ANKR_WALLET: process.env.ANKR_WALLET || runtime.getSetting("ANKR_WALLET") || envConfig.ANKR_WALLET,
      ANKR_MAX_RETRIES: process.env.ANKR_MAX_RETRIES || runtime.getSetting("ANKR_MAX_RETRIES") || envConfig.ANKR_MAX_RETRIES.toString(),
      ANKR_RETRY_DELAY: process.env.ANKR_RETRY_DELAY || runtime.getSetting("ANKR_RETRY_DELAY") || envConfig.ANKR_RETRY_DELAY.toString(),
      ANKR_TIMEOUT: process.env.ANKR_TIMEOUT || runtime.getSetting("ANKR_TIMEOUT") || envConfig.ANKR_TIMEOUT.toString(),
      ANKR_GRANULAR_LOG: process.env.ANKR_GRANULAR_LOG === "true" || false,
      ANKR_LOG_LEVEL: process.env.ANKR_LOG_LEVEL || runtime.getSetting("ANKR_LOG_LEVEL") || envConfig.ANKR_LOG_LEVEL,
      ANKR_RUNTIME_CHECK_MODE: process.env.RUNTIME_CHECK_MODE === "true" || false,
      ANKR_SPASH: process.env.ANKR_SPASH === "true" || false
    };
    return ankrEnvSchema.parse(config14);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to validate ANKR configuration: ${errorMessage}`);
  }
}

// src/actions/actionGetTokenHoldersCount.ts
import { elizaLogger as elizaLogger2 } from "@elizaos/core";
import axios from "axios";

// src/error/base.ts
var HyperbolicError = class _HyperbolicError extends Error {
  constructor(message) {
    super(message);
    this.name = "HyperbolicError";
    Object.setPrototypeOf(this, _HyperbolicError.prototype);
  }
};
var ConfigurationError = class _ConfigurationError extends HyperbolicError {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, _ConfigurationError.prototype);
  }
};
var APIError = class _APIError extends HyperbolicError {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "APIError";
    Object.setPrototypeOf(this, _APIError.prototype);
  }
};
var ValidationError = class _ValidationError extends HyperbolicError {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, _ValidationError.prototype);
  }
};

// src/validator/apiParseValidation.ts
import { elizaLogger } from "@elizaos/core";
var ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
var normalizeChainName = (chain) => {
  chain = chain.toLowerCase().trim();
  switch (chain) {
    case "eth":
    case "ethereum":
      return "eth";
    case "bsc":
    case "bnb":
      return "bsc";
    case "polygon":
    case "matic":
      return "polygon";
    case "avalanche":
    case "avax":
      return "avalanche";
    case "optimism":
    case "op":
      return "optimism";
    case "base":
      return "base";
    default:
      throw new ValidationError(`Unsupported blockchain: ${chain}`);
  }
};
var validateAddress = (address) => {
  return ADDRESS_REGEX.test(address);
};
var validateTxHash = (hash) => {
  return TX_HASH_REGEX.test(hash);
};
var validateBlockNumber = (block) => {
  return /^\d+$/.test(block);
};
var validateTimestamp = (timestamp) => {
  const num = parseInt(timestamp, 10);
  return !isNaN(num) && num > 0;
};
var validateTokenId = (tokenId) => {
  return tokenId.trim() !== "";
};
function parseAPIContent(text) {
  try {
    const parsed = {
      raw: {
        text,
        matches: {
          wallet: false,
          chain: false,
          contract: false,
          token: false,
          txHash: false,
          block: false,
          block2: false,
          fromTimestamp: false,
          toTimestamp: false
        }
      }
    };
    const walletMatch = text.match(/\[wallet\]([\s\S]*?)\[\/wallet\]/);
    if (walletMatch) {
      const wallet = walletMatch[1].trim();
      if (!validateAddress(wallet)) {
        throw new ValidationError(`Invalid wallet address: ${wallet}`);
      }
      parsed.wallet = wallet;
      parsed.raw.matches.wallet = true;
    }
    const chainMatch = text.match(/\[chain\]([\s\S]*?)\[\/chain\]/);
    if (chainMatch) {
      const chain = chainMatch[1].trim();
      parsed.chain = normalizeChainName(chain);
      parsed.raw.matches.chain = true;
    }
    const contractMatch = text.match(/\[contract\]([\s\S]*?)\[\/contract\]/);
    if (contractMatch) {
      const contract = contractMatch[1].trim();
      if (!validateAddress(contract)) {
        throw new ValidationError(`Invalid contract address: ${contract}`);
      }
      parsed.contract = contract;
      parsed.raw.matches.contract = true;
    }
    const tokenMatch = text.match(/\[token\]([\s\S]*?)\[\/token\]/);
    if (tokenMatch) {
      const token = tokenMatch[1].trim();
      if (!validateTokenId(token)) {
        throw new ValidationError(`Invalid token ID: ${token}`);
      }
      parsed.token = token;
      parsed.raw.matches.token = true;
    }
    const txMatch = text.match(/\[txHash\]([\s\S]*?)\[\/txHash\]/);
    if (txMatch) {
      const txHash = txMatch[1].trim();
      if (!validateTxHash(txHash)) {
        throw new ValidationError(`Invalid transaction hash: ${txHash}`);
      }
      parsed.txHash = txHash;
      parsed.raw.matches.txHash = true;
    }
    const blockMatch = text.match(/\[block\]([\s\S]*?)\[\/block\]/);
    if (blockMatch) {
      const block = blockMatch[1].trim();
      if (!validateBlockNumber(block)) {
        throw new ValidationError(`Invalid block number: ${block}`);
      }
      parsed.block = block;
      parsed.raw.matches.block = true;
    }
    const block2Match = text.match(/\[block2\]([\s\S]*?)\[\/block2\]/);
    if (block2Match) {
      const block2 = block2Match[1].trim();
      if (!validateBlockNumber(block2)) {
        throw new ValidationError(`Invalid block number: ${block2}`);
      }
      parsed.block2 = block2;
      parsed.raw.matches.block2 = true;
    }
    const fromTimestampMatch = text.match(/\[fromtimestamp\]([\s\S]*?)\[\/fromtimestamp\]/);
    if (fromTimestampMatch) {
      const timestamp = fromTimestampMatch[1].trim();
      if (!validateTimestamp(timestamp)) {
        throw new ValidationError(`Invalid from timestamp: ${timestamp}`);
      }
      parsed.fromTimestamp = parseInt(timestamp, 10);
      parsed.raw.matches.fromTimestamp = true;
    }
    const toTimestampMatch = text.match(/\[totimestamp\]([\s\S]*?)\[\/totimestamp\]/);
    if (toTimestampMatch) {
      const timestamp = toTimestampMatch[1].trim();
      if (!validateTimestamp(timestamp)) {
        throw new ValidationError(`Invalid to timestamp: ${timestamp}`);
      }
      parsed.toTimestamp = parseInt(timestamp, 10);
      parsed.raw.matches.toTimestamp = true;
    }
    return parsed;
  } catch (error) {
    elizaLogger.error("API content parsing failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
function validateRequiredFields(parsed, required) {
  const missing = required.filter((field) => !parsed.raw.matches[field]);
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(", ")}. Please provide them in the format [field]value[/field]`
    );
  }
}

// src/actions/actionGetTokenHoldersCount.ts
var config = getConfig();
var GRANULAR_LOG = config.ANKR_GRANULAR_LOG;
var logGranular = (message, data) => {
  if (GRANULAR_LOG) {
    elizaLogger2.debug(`[GetTokenHoldersCount] ${message}`, data);
    console.log(`[GetTokenHoldersCount] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetTokenHoldersCount = {
  name: "GET_TOKEN_HOLDERS_COUNT_ANKR",
  similes: ["COUNT_HOLDERS", "TOTAL_HOLDERS", "HOLDERS_COUNT", "NUMBER_OF_HOLDERS"],
  description: "Get the total number of holders and historical data for a specific token.",
  // Fix the example data to match the interface
  examples: [[
    {
      user: "user",
      content: {
        text: "How many holders does [contract]0xdAC17F958D2ee523a2206206994597C13D831ec7[/contract] have? [chain]eth[/chain]",
        filters: {
          blockchain: "eth",
          contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Token Holders Count on ETH:\n\nCurrent Holders: 500,000\n\nHistorical Data:\n1. 1/24/2024\n   Holders: 500,000\n   Total Amount: 1,000,000\n\nSync Status: completed (0s)",
        success: true,
        data: {
          blockchain: "eth",
          contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          tokenDecimals: 18,
          holderCountHistory: [
            {
              holderCount: 5e5,
              totalAmount: "1000000",
              totalAmountRawInteger: "1000000000000000000000000",
              lastUpdatedAt: "2024-01-24T10:30:15Z"
            }
          ],
          latestHoldersCount: 5e5,
          syncStatus: {
            timestamp: 1706093415,
            lag: "0s",
            status: "completed"
          }
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_TOKEN_HOLDERS_COUNT_ANKR") {
      return true;
    }
    logGranular("Validating GET_TOKEN_HOLDERS_COUNT_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      const parsedContent = parseAPIContent(content.text);
      if (!parsedContent.chain || !parsedContent.contract) {
        throw new ValidationError("Blockchain and contract address are required");
      }
      logGranular("Validation successful");
      return true;
    } catch (error) {
      logGranular("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular("Executing GET_TOKEN_HOLDERS_COUNT_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasContract: !!parsedContent.contract,
        hasChain: !!parsedContent.chain,
        contract: parsedContent.contract,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["contract", "chain"]);
      const requestParams = {
        blockchain: parsedContent.chain,
        contractAddress: parsedContent.contract,
        pageSize: 10
      };
      try {
        const response = await axios.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getTokenHoldersCount",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const result = response.data.result;
        let formattedText = `Token Holders Count on ${parsedContent.chain?.toUpperCase() || "UNKNOWN"}:

`;
        formattedText += `Current Holders: ${result.latestHoldersCount.toLocaleString()}

`;
        formattedText += "Historical Data:\n";
        result.holderCountHistory.forEach((history, index) => {
          const date = new Date(history.lastUpdatedAt).toLocaleDateString();
          formattedText += `
${index + 1}. ${date}
   Holders: ${history.holderCount.toLocaleString()}
   Total Amount: ${Number(history.totalAmount).toLocaleString()}`;
        });
        if (result.syncStatus) {
          formattedText += `

Sync Status: ${result.syncStatus.status} (${result.syncStatus.lag})`;
        }
        if (callback) {
          logGranular("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: result
          });
        }
        return true;
      } catch (error) {
        logGranular("API request failed", { error });
        if (axios.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch token holders count: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch token holders count");
      }
    } catch (error) {
      logGranular("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting token holders count: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_TOKEN_HOLDERS_COUNT_ANKR action");
    }
  }
};

// src/actions/actionGetTokenPrice.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
import axios2 from "axios";
var config2 = getConfig();
var GRANULAR_LOG2 = config2.ANKR_GRANULAR_LOG;
var logGranular2 = (message, data) => {
  if (GRANULAR_LOG2) {
    elizaLogger3.debug(`[GetTokenPrice] ${message}`, data);
    console.log(`[GetTokenPrice] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetTokenPrice = {
  name: "GET_TOKEN_PRICE_ANKR",
  similes: ["CHECK_PRICE", "TOKEN_PRICE", "CRYPTO_PRICE", "PRICE_CHECK"],
  description: "Get the current USD price for any token on eth blockchain.",
  examples: [[
    {
      user: "user",
      content: {
        text: "What's the current price of [contract]0x8290333cef9e6d528dd5618fb97a76f268f3edd4[/contract] token [chain]eth[/chain]",
        filters: {
          blockchain: "eth",
          contractAddress: "0x8290333cef9e6d528dd5618fb97a76f268f3edd4"
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Current token price on eth:\n\nPrice: $0.03024 USD\nContract: 0x8290...3edd4\nSync Status: synced (lag: -8s)",
        success: true,
        data: {
          blockchain: "eth",
          contractAddress: "0x8290333cef9e6d528dd5618fb97a76f268f3edd4",
          usdPrice: "0.030239944206509556547",
          syncStatus: {
            timestamp: 1737760907,
            lag: "-8s",
            status: "synced"
          }
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_TOKEN_PRICE_ANKR") {
      return true;
    }
    logGranular2("Validating GET_TOKEN_PRICE_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      const parsedContent = parseAPIContent(content.text);
      if (!parsedContent.chain || !parsedContent.contract) {
        throw new ValidationError("Blockchain and contract address are required");
      }
      logGranular2("Validation successful");
      return true;
    } catch (error) {
      logGranular2("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular2("Executing GET_TOKEN_PRICE_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      validateRequiredFields(parsedContent, ["contract", "chain"]);
      try {
        const response = await axios2.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getTokenPrice",
            params: {
              blockchain: parsedContent.chain,
              contractAddress: parsedContent.contract
            },
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular2("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const result = response.data.result;
        const price = Number(result.usdPrice).toFixed(5);
        const formattedText = `Current token price on ${parsedContent.chain}:

Price: $${price} USD
Contract: ${result.contractAddress.slice(0, 6)}...${result.contractAddress.slice(-4)}
Sync Status: ${result.syncStatus.status} (lag: ${result.syncStatus.lag})`;
        if (callback) {
          callback({
            text: formattedText,
            success: true,
            data: result
          });
        }
        return true;
      } catch (error) {
        logGranular2("API request failed", { error });
        if (axios2.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch token price: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch token price");
      }
    } catch (error) {
      logGranular2("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting token price: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_TOKEN_PRICE_ANKR action");
    }
  }
};

// src/actions/actionGetTokenTransfers.ts
import { elizaLogger as elizaLogger4 } from "@elizaos/core";
import axios3 from "axios";
var config3 = getConfig();
var GRANULAR_LOG3 = config3.ANKR_GRANULAR_LOG;
var logGranular3 = (message, data) => {
  if (GRANULAR_LOG3) {
    elizaLogger4.debug(`[GetTokenTransfers] ${message}`, data);
    console.log(`[GetTokenTransfers] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetTokenTransfers = {
  name: "GET_TOKEN_TRANSFERS_ANKR",
  similes: ["LIST_TRANSFERS", "SHOW_TRANSFERS", "TOKEN_MOVEMENTS", "TRANSFER_HISTORY"],
  description: "Get transfer history for a specific token or address on eth.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me recent contract [contract]0xff970a61a04b1ca14834a43f5de4533ebddb5cc8[/contract] transfers [chain]eth[/chain] from [fromtimestamp]1655197483[/fromtimestamp] to [totimestamp]1656061483[/totimestamp]",
        filters: {
          blockchain: "eth",
          contractAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
          pageSize: 5,
          fromTimestamp: 1655197483,
          toTimestamp: 1656061483
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the 5 most recent USDC transfers on eth:\n\n1. Transfer\n   From: 0x1234...5678\n   To: 0xabcd...ef01\n   Amount: 10,000 USDC\n   Time: 2024-01-24 10:30:15\n\n2. Transfer\n   From: 0x9876...5432\n   To: 0xfedc...ba98\n   Amount: 5,000 USDC\n   Time: 2024-01-24 10:29:45",
        success: true,
        data: {
          transfers: [{
            fromAddress: "0x1234567890123456789012345678901234567890",
            toAddress: "0xabcdef0123456789abcdef0123456789abcdef01",
            contractAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
            value: "10000.0",
            valueRawInteger: "10000000000000000000000",
            blockchain: "eth",
            tokenName: "USD Coin",
            tokenSymbol: "USDC",
            tokenDecimals: 6,
            thumbnail: "",
            transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            blockHeight: 123456789,
            timestamp: 1706093415
          }],
          syncStatus: {
            timestamp: 1706093415,
            lag: "0s",
            status: "completed"
          }
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_TOKEN_TRANSFERS_ANKR") {
      return true;
    }
    logGranular3("Validating GET_TOKEN_TRANSFERS_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      const parsedContent = parseAPIContent(content.text);
      if (!parsedContent.chain || !parsedContent.contract) {
        throw new ValidationError("Blockchain and contract address are required");
      }
      if (parsedContent.fromTimestamp && parsedContent.toTimestamp) {
        if (parsedContent.fromTimestamp > parsedContent.toTimestamp) {
          throw new ValidationError("From timestamp must be less than to timestamp");
        }
      }
      logGranular3("Validation successful");
      return true;
    } catch (error) {
      logGranular3("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular3("Executing GET_TOKEN_TRANSFERS_ANKR action");
    try {
      const messageContent = message.content;
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasContract: !!parsedContent.contract,
        hasChain: !!parsedContent.chain,
        hasFromTimestamp: !!parsedContent.fromTimestamp,
        hasToTimestamp: !!parsedContent.toTimestamp,
        contract: parsedContent.contract,
        chain: parsedContent.chain,
        fromTimestamp: parsedContent.fromTimestamp,
        toTimestamp: parsedContent.toTimestamp
      });
      validateRequiredFields(parsedContent, ["contract", "chain", "fromTimestamp", "toTimestamp"]);
      try {
        const response = await axios3.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getTokenTransfers",
            params: {
              address: parsedContent.contract,
              blockchain: [parsedContent.chain],
              fromTimestamp: parsedContent.fromTimestamp,
              toTimestamp: parsedContent.toTimestamp,
              pageSize: messageContent.filters?.pageSize || 10
            },
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular3("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const result = response.data.result;
        let formattedText = `Token Transfers on ${parsedContent.chain?.toUpperCase() || "UNKNOWN"}:

`;
        result.transfers.forEach((transfer, index) => {
          const date = new Date(transfer.timestamp * 1e3).toLocaleString();
          const value = Number(transfer.value).toLocaleString();
          formattedText += `${index + 1}. Transfer
`;
          formattedText += `   From: ${transfer.fromAddress.slice(0, 6)}...${transfer.fromAddress.slice(-4)}
`;
          formattedText += `   To: ${transfer.toAddress.slice(0, 6)}...${transfer.toAddress.slice(-4)}
`;
          formattedText += `   Amount: ${value} ${transfer.tokenSymbol}
`;
          formattedText += `   Token: ${transfer.tokenName}
`;
          formattedText += `   Time: ${date}

`;
        });
        if (result.syncStatus) {
          formattedText += `
Sync Status: ${result.syncStatus.status} (lag: ${result.syncStatus.lag})
`;
        }
        if (callback) {
          logGranular3("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: {
              transfers: result.transfers,
              nextPageToken: result.nextPageToken
            }
          });
        }
        return true;
      } catch (error) {
        logGranular3("API request failed", { error });
        if (axios3.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch token transfers: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch token transfers");
      }
    } catch (error) {
      logGranular3("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting token transfers: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_TOKEN_TRANSFERS_ANKR action");
    }
  }
};

// src/actions/actionGetAccountBalance.ts
import { elizaLogger as elizaLogger5 } from "@elizaos/core";
import axios4 from "axios";
var config4 = getConfig();
var GRANULAR_LOG4 = config4.ANKR_GRANULAR_LOG;
var logGranular4 = (message, data) => {
  if (GRANULAR_LOG4) {
    elizaLogger5.debug(`[GetAccountBalance] ${message}`, data);
    console.log(`[GetAccountBalance] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetAccountBalance = {
  name: "GET_ACCOUNT_BALANCE_ANKR",
  similes: ["CHECK_BALANCE", "SHOW_BALANCE", "VIEW_BALANCE", "GET_WALLET_BALANCE"],
  description: "Retrieve account balance information across multiple blockchains.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me the balance for wallet [wallet]0x1234567890123456789012345678901234567890[/wallet] on [chain]eth[/chain]",
        filters: {
          blockchain: ["eth"],
          walletAddress: "0x1234567890123456789012345678901234567890"
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the balances for wallet 0x1234...7890:\n\n1. ETH (Native)\n   Balance: 1.5 ETH\n   USD Value: $3,000.00\n\n2. USDC (ERC20)\n   Balance: 1000 USDC\n   Contract: 0xa0b8...c4d5\n   USD Value: $1,000.00",
        success: true,
        data: {
          address: "0x1234567890123456789012345678901234567890",
          balances: [{
            blockchain: "eth",
            tokenName: "Ethereum",
            symbol: "ETH",
            balance: "1.5",
            balanceRawInteger: "1500000000000000000",
            balanceUsd: "3000.00",
            tokenDecimals: 18,
            tokenType: "NATIVE"
          }, {
            blockchain: "eth",
            tokenName: "USD Coin",
            symbol: "USDC",
            balance: "1000",
            balanceRawInteger: "1000000000",
            balanceUsd: "1000.00",
            tokenDecimals: 6,
            tokenType: "ERC20",
            contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
          }]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_ACCOUNT_BALANCE_ANKR") {
      return true;
    }
    logGranular4("Validating GET_ACCOUNT_BALANCE_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.walletAddress) {
        throw new ValidationError("Wallet address is required");
      }
      if (content.filters?.blockchain && !Array.isArray(content.filters.blockchain)) {
        throw new ValidationError("Blockchain must be an array");
      }
      logGranular4("Validation successful");
      return true;
    } catch (error) {
      logGranular4("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular4("Executing GET_ACCOUNT_BALANCE_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      console.log("Debug - Message content details:", {
        hasText: !!messageContent?.text,
        hasFilters: !!messageContent?.filters,
        textContent: messageContent?.text,
        contentType: typeof messageContent?.text
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasWallet: !!parsedContent.wallet,
        hasChain: !!parsedContent.chain,
        wallet: parsedContent.wallet,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["wallet", "chain"]);
      const requestParams = {
        blockchain: [parsedContent.chain],
        walletAddress: parsedContent.wallet
      };
      console.log("Debug - API request parameters:", {
        params: requestParams,
        endpoint: ANKR_ENDPOINTS.production.multichain
      });
      try {
        const response = await axios4.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getAccountBalance",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular4("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const balances = response.data.result.assets;
        const address = parsedContent.wallet;
        let formattedText = `Here are the balances for wallet ${address?.slice(0, 6)}...${address?.slice(-4)}:

`;
        balances.forEach((balance, index) => {
          formattedText += `${index + 1}. ${balance.tokenName} (${balance.tokenType})
`;
          formattedText += `   Balance: ${balance.balance} ${balance.tokenSymbol}
`;
          if (balance.contractAddress) {
            formattedText += `   Contract: ${balance.contractAddress.slice(0, 6)}...${balance.contractAddress.slice(-4)}
`;
          }
          formattedText += `   USD Value: $${Number.parseFloat(balance.balanceUsd).toFixed(2)}

`;
        });
        if (callback) {
          logGranular4("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: {
              address,
              balances
            }
          });
        }
        return true;
      } catch (error) {
        logGranular4("API request failed", { error });
        if (axios4.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch balance data: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch balance data");
      }
    } catch (error) {
      logGranular4("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting account balance: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_ACCOUNT_BALANCE_ANKR action");
    }
  }
};

// src/actions/actionGetTransactionsByAddress.ts
import { elizaLogger as elizaLogger6 } from "@elizaos/core";
import axios5 from "axios";
var config5 = getConfig();
var GRANULAR_LOG5 = config5.ANKR_GRANULAR_LOG;
var logGranular5 = (message, data) => {
  if (GRANULAR_LOG5) {
    elizaLogger6.debug(`[GetTransactionsByAddress] ${message}`, data);
    console.log(`[GetTransactionsByAddress] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetTransactionsByAddress = {
  name: "GET_TRANSACTIONS_BY_ADDRESS_ANKR",
  similes: ["LIST_TXS", "SHOW_TXS", "VIEW_TRANSACTIONS", "GET_ADDRESS_TXS"],
  description: "Get transactions for a specific address on the blockchain",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me the latest transactions for address [contract]0xd8da6bf26964af9d7eed9e03e53415d37aa96045[/contract] [chain]eth[/chain]",
        filters: {
          blockchain: "eth",
          address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          pageSize: 2,
          includeLogs: true
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the latest transactions for the address on eth:\n\n1. Transfer Out\n   To: 0x1234...5678\n   Amount: 1.5 ETH\n   Time: 2024-01-24 10:30:15\n   Status: Success\n\n2. Contract Interaction\n   Contract: 0xabcd...ef01 (Uniswap V3)\n   Method: swapExactTokensForTokens\n   Time: 2024-01-24 10:15:22\n   Status: Success",
        success: true,
        data: {
          transactions: [{
            blockchain: "eth",
            from: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            to: "0x1234567890123456789012345678901234567890",
            hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            value: "1500000000000000000",
            gas: "21000",
            gasPrice: "100000000",
            gasUsed: "21000",
            timestamp: "2024-01-24T10:30:15Z",
            status: "1",
            blockNumber: "123456789",
            blockHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"
          }]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_TRANSACTIONS_BY_ADDRESS_ANKR") {
      return true;
    }
    logGranular5("Validating GET_TRANSACTIONS_BY_ADDRESS_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      const parsedContent = parseAPIContent(content.text);
      if (!parsedContent.chain || !parsedContent.contract) {
        throw new ValidationError("Blockchain and address are required");
      }
      if (content.filters?.pageSize && (content.filters.pageSize < 1 || content.filters.pageSize > 100)) {
        throw new ValidationError("Page size must be between 1 and 100");
      }
      logGranular5("Validation successful");
      return true;
    } catch (error) {
      logGranular5("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular5("Executing GET_TRANSACTIONS_BY_ADDRESS_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      console.log("Debug - Message content details:", {
        hasText: !!messageContent?.text,
        hasFilters: !!messageContent?.filters,
        textContent: messageContent?.text,
        contentType: typeof messageContent?.text
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasContract: !!parsedContent.contract,
        hasChain: !!parsedContent.chain,
        contract: parsedContent.contract,
        chain: parsedContent.chain
      });
      validateRequiredFields(parsedContent, ["contract", "chain"]);
      try {
        const response = await axios5.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getTransactionsByAddress",
            params: {
              blockchain: [parsedContent.chain],
              address: parsedContent.contract,
              pageSize: messageContent.filters?.pageSize || 5,
              includeLogs: messageContent.filters?.includeLogs || true
            },
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const result = response.data.result;
        let formattedText = `Transactions for ${parsedContent.contract} on ${parsedContent.chain?.toUpperCase() || "UNKNOWN"}:

`;
        result.transactions.forEach((tx, index) => {
          const date = new Date(Number.parseInt(tx.timestamp, 16) * 1e3).toLocaleString();
          const value = Number.parseInt(tx.value, 16) / 1e18;
          const status = tx.status === "0x1" ? "Success" : "Failed";
          formattedText += `${index + 1}. Transaction
`;
          formattedText += `   Hash: ${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}
`;
          formattedText += `   From: ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}
`;
          formattedText += `   To: ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}
`;
          formattedText += `   Value: ${value.toFixed(4)} ETH
`;
          formattedText += `   Status: ${status}
`;
          formattedText += `   Time: ${date}

`;
        });
        if (callback) {
          callback({
            text: formattedText,
            success: true,
            data: {
              transactions: result.transactions,
              nextPageToken: result.nextPageToken,
              syncStatus: result.syncStatus
            }
          });
        }
        return true;
      } catch (error) {
        logGranular5("API request failed", { error });
        if (axios5.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch transactions: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch transactions");
      }
    } catch (error) {
      logGranular5("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting transactions: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_TRANSACTIONS_BY_ADDRESS_ANKR action");
    }
  }
};

// src/actions/actionGetTransactionsByHash.ts
import { elizaLogger as elizaLogger7 } from "@elizaos/core";
import axios6 from "axios";
var config6 = getConfig();
var GRANULAR_LOG6 = config6.ANKR_GRANULAR_LOG;
var logGranular6 = (message, data) => {
  if (GRANULAR_LOG6) {
    elizaLogger7.debug(`[GetTransactionsByHash] ${message}`, data);
    console.log(`[GetTransactionsByHash] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetTransactionsByHash = {
  name: "GET_TRANSACTIONS_BY_HASH_ANKR",
  similes: ["GET_TX", "SHOW_TRANSACTION", "VIEW_TX", "TRANSACTION_DETAILS"],
  description: "Get detailed information about a transaction by its hash",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me details for transaction [txHash]0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef[/txHash] [chain]eth[/chain]",
        filters: {
          blockchain: "eth",
          transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          includeLogs: true
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the details for the transaction on eth:\n\nTransaction: 0x1234...cdef\nStatus: Success\nFrom: 0xabcd...ef01\nTo: 0x9876...5432\nValue: 1.5 ETH\nGas Used: 150,000\nGas Price: 0.1 Gwei\nBlock: 123456789\nTimestamp: 2024-01-24 10:30:15",
        success: true,
        data: {
          transactions: [{
            blockchain: "eth",
            from: "0xabcdef0123456789abcdef0123456789abcdef01",
            to: "0x9876543210987654321098765432109876543210",
            hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            value: "1500000000000000000",
            gas: "21000",
            gasPrice: "100000000",
            gasUsed: "21000",
            timestamp: "2024-01-24T10:30:15Z",
            status: "1",
            blockNumber: "123456789",
            blockHash: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
          }]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_TRANSACTIONS_BY_HASH_ANKR") {
      return true;
    }
    logGranular6("Validating GET_TRANSACTIONS_BY_HASH_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      const parsedContent = parseAPIContent(content.text);
      if (!parsedContent.chain || !parsedContent.txHash) {
        throw new ValidationError("Blockchain and transaction hash are required");
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(parsedContent.txHash)) {
        throw new ValidationError("Invalid transaction hash format");
      }
      logGranular6("Validation successful");
      return true;
    } catch (error) {
      logGranular6("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular6("Executing GET_TRANSACTIONS_BY_HASH_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      console.log("Debug - Message content details:", {
        hasText: !!messageContent?.text,
        hasFilters: !!messageContent?.filters,
        textContent: messageContent?.text,
        contentType: typeof messageContent?.text
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasTx: !!parsedContent.txHash,
        hasChain: !!parsedContent.chain,
        tx: parsedContent.txHash,
        chain: parsedContent.chain
      });
      validateRequiredFields(parsedContent, ["txHash", "chain"]);
      try {
        const response = await axios6.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getTransactionsByHash",
            params: {
              blockchain: parsedContent.chain,
              transactionHash: parsedContent.txHash,
              includeLogs: true
            },
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const transaction = response.data.result.transactions[0];
        const timestamp = new Date(Number.parseInt(transaction.timestamp, 16) * 1e3).toLocaleString();
        const value = Number.parseInt(transaction.value, 16) / 1e18;
        const gasPrice = Number.parseInt(transaction.gasPrice, 16) / 1e9;
        const gasUsed = Number.parseInt(transaction.gasUsed, 16);
        const blockNumber = Number.parseInt(transaction.blockNumber, 16);
        const status = transaction.status === "0x1" ? "Success" : "Failed";
        let formattedText = `Transaction Details on ${parsedContent.chain?.toUpperCase() || "UNKNOWN"}:

`;
        formattedText += `Hash: ${transaction.hash}
`;
        formattedText += `Status: ${status}
`;
        formattedText += `From: ${transaction.from.slice(0, 6)}...${transaction.from.slice(-4)}
`;
        formattedText += `To: ${transaction.to.slice(0, 6)}...${transaction.to.slice(-4)}
`;
        formattedText += `Value: ${value.toFixed(6)} ETH
`;
        formattedText += `Gas Used: ${gasUsed.toLocaleString()}
`;
        formattedText += `Gas Price: ${gasPrice.toFixed(2)} Gwei
`;
        formattedText += `Block: ${blockNumber.toLocaleString()}
`;
        formattedText += `Time: ${timestamp}`;
        if (callback) {
          callback({
            text: formattedText,
            success: true,
            data: response.data.result
          });
        }
        return true;
      } catch (error) {
        logGranular6("API request failed", { error });
        if (axios6.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch transaction: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch transaction");
      }
    } catch (error) {
      logGranular6("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting transaction: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_TRANSACTIONS_BY_HASH_ANKR action");
    }
  }
};

// src/actions/actionGetBlockchainStats.ts
import { elizaLogger as elizaLogger8 } from "@elizaos/core";
import axios7 from "axios";
var config7 = getConfig();
var GRANULAR_LOG7 = config7.ANKR_GRANULAR_LOG;
var logGranular7 = (message, data) => {
  if (GRANULAR_LOG7) {
    elizaLogger8.debug(`[GetBlockchainStats] ${message}`, data);
    console.log(`[GetBlockchainStats] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetBlockchainStats = {
  name: "GET_BLOCKCHAIN_STATS_ANKR",
  similes: ["CHAIN_STATS", "BLOCKCHAIN_INFO", "NETWORK_STATS", "CHAIN_METRICS"],
  description: "Retrieve statistical information about specified blockchain networks.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me stats for [chain]eth[/chain] blockchain",
        filters: {
          blockchain: ["eth"]
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the current statistics for Ethereum:\n\nLatest Block: 19,234,567\nTotal Transactions: 2.5B\nActive Accounts: 245M\nTPS: 15.5\nGas Price: 25 Gwei\nMarket Cap: $250B\nTotal Value Locked: $45B",
        success: true,
        data: {
          stats: [{
            blockchain: "eth",
            latestBlock: 19234567,
            totalTransactions: "2500000000",
            totalAccounts: "245000000",
            tps: 15.5,
            gasPrice: "25000000000",
            marketCap: "250000000000",
            totalValueLocked: "45000000000"
          }]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_BLOCKCHAIN_STATS_ANKR") {
      return true;
    }
    logGranular7("Validating GET_BLOCKCHAIN_STATS_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (content.filters?.blockchain && !Array.isArray(content.filters.blockchain)) {
        throw new ValidationError("Blockchain must be an array");
      }
      logGranular7("Validation successful");
      return true;
    } catch (error) {
      logGranular7("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular7("Executing GET_BLOCKCHAIN_STATS_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      console.log("Debug - Message content details:", {
        hasText: !!messageContent?.text,
        hasFilters: !!messageContent?.filters,
        textContent: messageContent?.text,
        contentType: typeof messageContent?.text
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasChain: !!parsedContent.chain,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["chain"]);
      const requestParams = {
        blockchain: parsedContent.chain
        // Changed from array to string
      };
      console.log("Debug - API request parameters:", {
        params: requestParams,
        endpoint: ANKR_ENDPOINTS.production.multichain
      });
      try {
        const response = await axios7.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getBlockchainStats",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular7("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const stats = response.data.result.stats;
        let formattedText = "";
        for (const stat of stats) {
          formattedText += `Statistics for ${stat.blockchain.toUpperCase()}:

`;
          formattedText += `Latest Block: ${stat.latestBlockNumber.toLocaleString()}
`;
          formattedText += `Total Transactions: ${(stat.totalTransactionsCount / 1e9).toFixed(1)}B
`;
          formattedText += `Total Events: ${(stat.totalEventsCount / 1e9).toFixed(1)}B
`;
          formattedText += `Block Time: ${(stat.blockTimeMs / 1e3).toFixed(1)} seconds
`;
          formattedText += `Native Coin Price: $${Number(stat.nativeCoinUsdPrice).toFixed(2)}

`;
        }
        if (callback) {
          logGranular7("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: {
              stats: stats.map((stat) => ({
                blockchain: stat.blockchain,
                latestBlock: stat.latestBlockNumber,
                totalTransactions: stat.totalTransactionsCount.toString(),
                totalEvents: stat.totalEventsCount.toString(),
                blockTime: stat.blockTimeMs / 1e3,
                nativeCoinPrice: stat.nativeCoinUsdPrice
              }))
            }
          });
        }
        return true;
      } catch (error) {
        logGranular7("API request failed", { error });
        if (axios7.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch blockchain stats: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch blockchain stats");
      }
    } catch (error) {
      logGranular7("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting blockchain stats: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_BLOCKCHAIN_STATS_ANKR action");
    }
  }
};

// src/actions/actionGetCurrencies.ts
import { elizaLogger as elizaLogger9 } from "@elizaos/core";
import axios8 from "axios";
var config8 = getConfig();
var GRANULAR_LOG8 = config8.ANKR_GRANULAR_LOG;
var logGranular8 = (message, data) => {
  if (GRANULAR_LOG8) {
    elizaLogger9.debug(`[GetCurrencies] ${message}`, data);
    console.log(`[GetCurrencies] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetCurrencies = {
  name: "GET_CURRENCIES_ANKR",
  similes: ["LIST_CURRENCIES", "SHOW_CURRENCIES", "VIEW_CURRENCIES", "FETCH_CURRENCIES"],
  description: "Retrieve information about currencies on specified blockchain networks.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me the top currencies on [chain]eth[/chain]",
        filters: {
          blockchain: "eth",
          pageSize: 5,
          pageToken: "eyJsYXN0X2JhbGFuY2UiOiIyIn0="
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the top currencies on Ethereum:\n\n1. Ethereum (ETH)\n   Market Cap: $250B\n   Holders: 2.5M\n   Total Supply: 120.5M ETH\n\n2. USD Coin (USDC)\n   Contract: 0xa0b8...c4d5\n   Market Cap: $45B\n   Holders: 1.2M\n   Total Supply: 45B USDC",
        success: true,
        data: {
          currencies: [
            {
              blockchain: "eth",
              address: "0x0000000000000000000000000000000000000000",
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18
            }
          ]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_CURRENCIES_ANKR") {
      return true;
    }
    logGranular8("Validating GET_CURRENCIES_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.blockchain) {
        throw new ValidationError("Blockchain is required");
      }
      logGranular8("Validation successful");
      return true;
    } catch (error) {
      logGranular8("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular8("Executing GET_CURRENCIES_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasChain: !!parsedContent.chain,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["chain"]);
      const requestParams = {
        blockchain: parsedContent.chain,
        pageSize: messageContent.filters?.pageSize ?? 5
      };
      console.log("Debug - API request parameters:", {
        params: requestParams,
        endpoint: ANKR_ENDPOINTS.production.multichain
      });
      try {
        const response = await axios8.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getCurrencies",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular8("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const currencies = response.data.result.currencies;
        let formattedText = `Here are the top currencies from ${parsedContent.chain ? parsedContent.chain[0].toUpperCase() : "Unknown Chain"}:

`;
        let index = 0;
        for (const currency of currencies) {
          formattedText += [
            `${index + 1}. ${currency.name} (${currency.symbol})`,
            currency.address ? `   Contract: ${currency.address.slice(0, 6)}...${currency.address.slice(-4)}` : "",
            `   Decimals: ${currency.decimals}`,
            currency.thumbnail ? `   Logo: ${currency.thumbnail}` : "",
            "",
            ""
          ].filter(Boolean).join("\n");
          index++;
        }
        if (callback) {
          logGranular8("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: {
              currencies,
              syncStatus: response.data.result.syncStatus
            }
          });
        }
        return true;
      } catch (error) {
        logGranular8("API request failed", { error });
        if (axios8.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch currencies data: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch currencies data");
      }
    } catch (error) {
      logGranular8("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting currencies: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_CURRENCIES_ANKR action");
    }
  }
};

// src/actions/actionGetInteractions.ts
import { elizaLogger as elizaLogger10 } from "@elizaos/core";
import axios9 from "axios";
var config9 = getConfig();
var GRANULAR_LOG9 = config9.ANKR_GRANULAR_LOG;
var logGranular9 = (message, data) => {
  if (GRANULAR_LOG9) {
    elizaLogger10.debug(`[GetInteractions] ${message}`, data);
    console.log(`[GetInteractions] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetInteractions = {
  name: "GET_INTERACTIONS_ANKR",
  similes: ["FETCH_INTERACTIONS", "SHOW_INTERACTIONS", "VIEW_INTERACTIONS", "LIST_INTERACTIONS"],
  description: "Retrieve interactions between wallets and smart contracts on specified blockchain networks.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me interactions for the wallet [wallet]0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45[/wallet]",
        filters: {
          blockchain: "eth",
          // Changed from string[] to string
          address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
          pageSize: 5,
          pageToken: "eyJsYXN0X2Jsb2NrIjoiMTIzNDU2Nzg4IiwibGFzdF9pbnRlcmFjdGlvbl9pbmRleCI6IjEifQ=="
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the recent interactions:\n\n1. Transfer (2024-03-15 14:30 UTC)\n   From: 0xabc...def1\n   To: 0x123...5678\n   Value: 1.5 ETH\n   Gas Used: 21,000\n   Tx Hash: 0xdef...789\n\n2. Approve (2024-03-15 14:25 UTC)\n   From: 0xabc...def1\n   To: 0x123...5678\n   Value: 0 ETH\n   Gas Used: 45,000\n   Tx Hash: 0x789...012",
        success: true,
        data: {
          interactions: [{
            blockchain: "eth",
            transactionHash: "0xdef...789",
            blockNumber: 17000100,
            timestamp: "2024-03-15T14:30:00Z",
            from: "0xabcdef1234567890abcdef1234567890abcdef12",
            to: "0x1234567890abcdef1234567890abcdef12345678",
            value: "1500000000000000000",
            gasPrice: "20000000000",
            gasUsed: "21000",
            methodName: "transfer",
            logs: [{
              address: "0x1234567890abcdef1234567890abcdef12345678",
              topics: ["0x000...123"],
              data: "0x000...456",
              logIndex: 0
            }]
          }]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_INTERACTIONS_ANKR") {
      return true;
    }
    logGranular9("Validating GET_INTERACTIONS_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.address) {
        throw new ValidationError("Wallet address is required");
      }
      logGranular9("Validation successful");
      return true;
    } catch (error) {
      logGranular9("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular9("Executing GET_INTERACTIONS_ANKR action");
    try {
      const messageContent = message.content;
      const parsedContent = parseAPIContent(messageContent.text);
      validateRequiredFields(parsedContent, ["wallet"]);
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      const requestParams = {
        blockchain: parsedContent.chain || "eth",
        address: parsedContent.wallet,
        pageSize: messageContent.filters?.pageSize ?? 5,
        pageToken: messageContent.filters?.pageToken
      };
      try {
        const response = await axios9.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getInteractions",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular9("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        const formattedText = `Blockchain Status Information:

Available Blockchains: ${response.data.result.blockchains.join(", ")}
Sync Status: ${response.data.result.syncStatus.status}
Lag: ${response.data.result.syncStatus.lag}`;
        if (callback) {
          callback({
            text: formattedText,
            success: true,
            data: {
              interactions: [],
              syncStatus: response.data.result.syncStatus,
              availableBlockchains: response.data.result.blockchains
            }
          });
        }
        return true;
      } catch (error) {
        logGranular9("API request failed", { error });
        if (axios9.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch interactions data: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch interactions data");
      }
    } catch (error) {
      logGranular9("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting interactions: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_INTERACTIONS_ANKR action");
    }
  }
};

// src/actions/actionGetNFTHolders.ts
import { elizaLogger as elizaLogger11 } from "@elizaos/core";
import axios10 from "axios";
var config10 = getConfig();
var GRANULAR_LOG10 = config10.ANKR_GRANULAR_LOG;
var logGranular10 = (message, data) => {
  if (GRANULAR_LOG10) {
    elizaLogger11.debug(`[GetNFTHolders] ${message}`, data);
    console.log(`[GetNFTHolders] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetNFTHolders = {
  name: "GET_NFT_HOLDERS_ANKR",
  similes: ["FETCH_NFT_HOLDERS", "SHOW_NFT_HOLDERS", "VIEW_NFT_HOLDERS", "LIST_NFT_HOLDERS"],
  description: "Retrieve holders of specific NFTs on specified blockchain networks.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me holders of NFT contract [contract]0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258[/contract] on [chain]bsc[/chain]",
        filters: {
          blockchain: "bsc",
          // Changed from string[] to string
          contractAddress: "0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258",
          pageSize: 5
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "Here are the NFT holders:\n\n1. 0xabc...def1\n   Balance: 1.5\n   Raw Balance: 1500000000000000000\n\n2. 0xdef...789a\n   Balance: 2.0\n   Raw Balance: 2000000000000000000",
        success: true,
        data: {
          holders: [{
            holderAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
            balance: "1.5",
            balanceRawInteger: "1500000000000000000"
          }],
          blockchain: "bsc",
          contractAddress: "0xf307910A4c7bbc79691fD374889b36d8531B08e3",
          tokenDecimals: 18,
          holdersCount: 1e3,
          syncStatus: {
            timestamp: 1737769593,
            lag: "-2m",
            status: "synced"
          }
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_NFT_HOLDERS_ANKR") {
      return true;
    }
    logGranular10("Validating GET_NFT_HOLDERS_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.contractAddress) {
        throw new ValidationError("Contract address is required");
      }
      if (content.filters?.blockchain && typeof content.filters.blockchain !== "string") {
        throw new ValidationError("Blockchain must be a string");
      }
      logGranular10("Validation successful");
      return true;
    } catch (error) {
      logGranular10("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular10("Executing GET_NFT_HOLDERS_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasContract: !!parsedContent.contract,
        hasToken: !!parsedContent.token,
        hasChain: !!parsedContent.chain,
        contract: parsedContent.contract,
        token: parsedContent.token,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["contract"]);
      const requestParams = {
        blockchain: parsedContent.chain,
        contractAddress: parsedContent.contract,
        pageSize: messageContent.filters?.pageSize || 10,
        pageToken: messageContent.filters?.pageToken
      };
      console.log("Debug - API request parameters:", {
        params: requestParams,
        endpoint
      });
      const response = await axios10.post(
        endpoint,
        {
          jsonrpc: "2.0",
          method: "ankr_getNFTHolders",
          params: requestParams,
          id: 1
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
      logGranular10("Received response from Ankr API", {
        statusCode: response.status,
        data: response.data
      });
      const result = response.data.result;
      const formattedText = `NFT Holders:
Total Holders: ${result.holders.length}

${result.holders.map(
        (holderAddress, index) => `${index + 1}. ${holderAddress}`
      ).join("\n")}

${result.nextPageToken ? "More holders available. Use the page token to see more.\n" : ""}
${result.syncStatus ? `Sync Status:
Last Update: ${new Date(result.syncStatus.timestamp * 1e3).toLocaleString()}
Lag: ${result.syncStatus.lag}
Status: ${result.syncStatus.status}` : ""}`;
      logGranular10("Formatted response text", { formattedText });
      if (callback) {
        logGranular10("Sending success callback with formatted text");
        callback({
          text: formattedText,
          success: true,
          data: {
            holders: result.holders.map((address) => ({
              holderAddress: address,
              balance: "1",
              // Default values since not provided in response
              balanceRawInteger: "1"
            })),
            nextPageToken: result.nextPageToken,
            syncStatus: result.syncStatus
          }
        });
      }
      return true;
    } catch (error) {
      logGranular10("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting NFT holders: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_NFT_HOLDERS_ANKR action");
    }
  }
};

// src/actions/actionGetNFTTransfers.ts
import { elizaLogger as elizaLogger12 } from "@elizaos/core";
import axios11 from "axios";
var config11 = getConfig();
var GRANULAR_LOG11 = config11.ANKR_GRANULAR_LOG;
var logGranular11 = (message, data) => {
  if (GRANULAR_LOG11) {
    elizaLogger12.debug(`[GetNFTTransfers] ${message}`, data);
    console.log(`[GetNFTTransfers] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetNFTTransfers = {
  name: "GET_NFT_TRANSFERS_ANKR",
  similes: ["LIST_NFT_TRANSFERS", "SHOW_NFT_TRANSFERS", "VIEW_NFT_TRANSFERS", "GET_NFT_HISTORY"],
  description: "Get NFT transfer history for a specific address or contract on eth.",
  // Fix the example data to match the interface
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me NFT transfers for contract [contract]0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258[/contract] [chain]eth[/chain] [fromtimestamp]1655197483[/fromtimestamp][totimestamp]1671974699[/totimestamp]",
        filters: {
          blockchain: "eth",
          contractAddress: "0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258",
          pageSize: 5
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "NFT Transfers:\n\n1. Transfer of Token #1234\n   From: 0xabcd...ef01\n   To: 0x9876...4321\n   Time: 1/24/2024, 10:30:15 AM\n   Token: CoolNFT #123\n\n2. Transfer of Token #456\n   From: 0x9876...3210\n   To: 0xfedc...ba98\n   Time: 1/24/2024, 10:15:22 AM\n   Token: CoolNFT #456\n",
        success: true,
        data: {
          transfers: [
            {
              fromAddress: "0xabcdef0123456789abcdef0123456789abcdef01",
              toAddress: "0x9876543210fedcba9876543210fedcba98765432",
              contractAddress: "0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258",
              value: "1",
              valueRawInteger: "1",
              blockchain: "eth",
              tokenName: "CoolNFT",
              tokenSymbol: "COOL",
              tokenDecimals: 18,
              thumbnail: "https://example.com/nft/123.png",
              transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
              blockHeight: 123456789,
              timestamp: 1706093415
            },
            {
              fromAddress: "0x9876543210987654321098765432109876543210",
              toAddress: "0xfedcba9876543210fedcba9876543210fedcba98",
              contractAddress: "0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258",
              value: "1",
              valueRawInteger: "1",
              blockchain: "eth",
              tokenName: "CoolNFT",
              tokenSymbol: "COOL",
              tokenDecimals: 18,
              thumbnail: "https://example.com/nft/456.png",
              transactionHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
              blockHeight: 123456788,
              timestamp: 1706092522
            }
          ],
          syncStatus: {
            timestamp: 1706093415,
            lag: "0s",
            status: "synced"
          }
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_NFT_TRANSFERS_ANKR") {
      return true;
    }
    logGranular11("Validating GET_NFT_TRANSFERS_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.blockchain || !content.filters?.contractAddress) {
        throw new ValidationError("Blockchain and contract address are required");
      }
      logGranular11("Validation successful");
      return true;
    } catch (error) {
      logGranular11("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular11("Executing GET_NFT_TRANSFERS_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      console.log("Debug - Message content details:", {
        hasText: !!messageContent?.text,
        hasFilters: !!messageContent?.filters,
        textContent: messageContent?.text,
        contentType: typeof messageContent?.text
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasContract: !!parsedContent.contract,
        hasChain: !!parsedContent.chain,
        hasFromTimestamp: !!parsedContent.fromTimestamp,
        hasToTimestamp: !!parsedContent.toTimestamp,
        contract: parsedContent.contract,
        chain: parsedContent.chain,
        fromTimestamp: parsedContent.fromTimestamp,
        toTimestamp: parsedContent.toTimestamp,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["contract", "chain", "fromTimestamp", "toTimestamp"]);
      const requestParams = {
        address: parsedContent.contract,
        blockchain: [parsedContent.chain],
        fromTimestamp: parsedContent.fromTimestamp,
        toTimestamp: parsedContent.toTimestamp
      };
      console.log("Debug - API request parameters:", {
        params: requestParams,
        endpoint: ANKR_ENDPOINTS.production.multichain
      });
      try {
        const response = await axios11.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getTokenTransfers",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular11("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const transfers = response.data.result.transfers;
        let formattedText = "Token Transfers:\n\n";
        transfers.forEach((transfer, index) => {
          formattedText += `${index + 1}. Transfer of ${transfer.tokenName} (${transfer.tokenSymbol})
`;
          formattedText += `   From: ${transfer.fromAddress.slice(0, 6)}...${transfer.fromAddress.slice(-4)}
`;
          formattedText += `   To: ${transfer.toAddress.slice(0, 6)}...${transfer.toAddress.slice(-4)}
`;
          formattedText += `   Amount: ${transfer.value}
`;
          formattedText += `   Time: ${new Date(transfer.timestamp * 1e3).toLocaleString()}
`;
          formattedText += `   Tx Hash: ${transfer.transactionHash}
`;
          if (transfer.thumbnail) {
            formattedText += `   Token Icon: ${transfer.thumbnail}
`;
          }
          formattedText += "\n";
        });
        if (callback) {
          logGranular11("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: {
              transfers,
              syncStatus: response.data.result.syncStatus
            }
          });
        }
        return true;
      } catch (error) {
        logGranular11("API request failed", { error });
        if (axios11.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch NFT transfers: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch NFT transfers");
      }
    } catch (error) {
      logGranular11("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting NFT transfers: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_NFT_TRANSFERS_ANKR action");
    }
  }
};

// src/actions/actionGetNFTMetadata.ts
import { elizaLogger as elizaLogger13 } from "@elizaos/core";
import axios12 from "axios";
var config12 = getConfig();
var GRANULAR_LOG12 = config12.ANKR_GRANULAR_LOG;
var logGranular12 = (message, data) => {
  if (GRANULAR_LOG12) {
    elizaLogger13.debug(`[GetNFTMetadata] ${message}`, data);
    console.log(`[GetNFTMetadata] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetNFTMetadata = {
  name: "GET_NFT_METADATA_ANKR",
  similes: ["GET_NFT_INFO", "SHOW_NFT_DETAILS", "VIEW_NFT", "NFT_METADATA"],
  description: "Get detailed metadata for a specific NFT including traits, images, and contract information.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me the metadata for NFT [token]1234[/token] at contract [contract]0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d[/contract] [chain]eth[/chain]",
        filters: {
          blockchain: "eth",
          contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
          tokenId: "1234"
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "NFT Metadata for Bored Ape #1234:\n\nCollection: Bored Ape Yacht Club\nContract: 0xbc4c...f13d (ERC721)\n\nDescription: A unique Bored Ape NFT living on the Ethereum blockchain\n\nTraits:\n- Background: Blue\n- Fur: Dark Brown\n- Eyes: Bored\n- Mouth: Grin\n",
        success: true,
        data: {
          metadata: {
            blockchain: "eth",
            contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
            contractType: "ERC721",
            tokenId: "1234"
          },
          attributes: {
            contractType: "ERC721",
            tokenUrl: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/1234",
            imageUrl: "ipfs://QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ",
            name: "Bored Ape #1234",
            description: "A unique Bored Ape NFT living on the Ethereum blockchain",
            traits: [
              { trait_type: "Background", value: "Blue" },
              { trait_type: "Fur", value: "Dark Brown" },
              { trait_type: "Eyes", value: "Bored" },
              { trait_type: "Mouth", value: "Grin" }
            ]
          }
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_NFT_METADATA_ANKR") {
      return true;
    }
    logGranular12("Validating GET_NFT_METADATA_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.blockchain || !content.filters?.contractAddress || !content.filters?.tokenId) {
        throw new ValidationError("Blockchain, contract address, and token ID are required");
      }
      logGranular12("Validation successful");
      return true;
    } catch (error) {
      logGranular12("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular12("Executing GET_NFT_METADATA_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type,
        allKeys: Object.keys(message.content || {})
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      console.log("Debug - Raw prompt:", {
        text: messageContent.text,
        promptLength: messageContent.text?.length
      });
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasContract: !!parsedContent.contract,
        hasToken: !!parsedContent.token,
        hasChain: !!parsedContent.chain,
        contract: parsedContent.contract,
        token: parsedContent.token,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["contract", "token", "chain"]);
      const requestParams = {
        blockchain: parsedContent.chain,
        contractAddress: parsedContent.contract,
        tokenId: parsedContent.token
      };
      console.log("Debug - API request parameters:", {
        params: requestParams,
        endpoint: ANKR_ENDPOINTS.production.multichain
      });
      try {
        const response = await axios12.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getNFTMetadata",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular12("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const nftData = response.data.result;
        let formattedText = `NFT Metadata for ${nftData.attributes.name}:

`;
        formattedText += `Collection: ${nftData.attributes.name.split("#")[0].trim()}
`;
        formattedText += `Contract: ${nftData.metadata.contractAddress.slice(0, 6)}...${nftData.metadata.contractAddress.slice(-4)} (${nftData.metadata.contractType})

`;
        if (nftData.attributes.description) {
          formattedText += `Description: ${nftData.attributes.description}

`;
        }
        if (nftData.attributes.traits && nftData.attributes.traits.length > 0) {
          formattedText += "Traits:\n";
          for (const trait of nftData.attributes.traits) {
            formattedText += `- ${trait.trait_type}: ${trait.value}
`;
          }
        }
        if (nftData.attributes.imageUrl) {
          formattedText += `
Image URL: ${nftData.attributes.imageUrl}
`;
        }
        if (callback) {
          logGranular12("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: nftData
          });
        }
        return true;
      } catch (error) {
        logGranular12("API request failed", { error });
        if (axios12.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch NFT metadata: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch NFT metadata");
      }
    } catch (error) {
      logGranular12("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting NFT metadata: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_NFT_METADATA_ANKR action");
    }
  }
};

// src/actions/actionGetNFTsByOwner.ts
import { elizaLogger as elizaLogger14 } from "@elizaos/core";
import axios13 from "axios";
var config13 = getConfig();
var GRANULAR_LOG13 = config13.ANKR_GRANULAR_LOG;
var logGranular13 = (message, data) => {
  if (GRANULAR_LOG13) {
    elizaLogger14.debug(`[GetNFTsByOwner] ${message}`, data);
    console.log(`[GetNFTsByOwner] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
};
var actionGetNFTsByOwner = {
  name: "GET_NFTS_BY_OWNER_ANKR",
  similes: ["LIST_NFTS", "SHOW_NFTS", "VIEW_NFTS", "FETCH_NFTS", "GET_OWNED_NFTS"],
  description: "Retrieve all NFTs owned by a specific wallet address across multiple blockchains with detailed metadata.",
  examples: [[
    {
      user: "user",
      content: {
        text: "Show me all NFTs owned by wallet [wallet]0x1234567890123456789012345678901234567890[/wallet] on [chain]eth[/chain]",
        filters: {
          blockchain: ["eth"],
          walletAddress: "0x1234567890123456789012345678901234567890",
          pageSize: 10
        }
      }
    },
    {
      user: "assistant",
      content: {
        text: "NFTs owned by 0x1234567890123456789012345678901234567890:\n\n1. Bored Ape #1234\n   Collection: Bored Ape Yacht Club\n   Contract: 0xbc4c...f13d\n   Token ID: 1234\n\n2. CryptoPunk #5678\n   Collection: CryptoPunks\n   Contract: 0x2505...42a2\n   Token ID: 5678\n",
        success: true,
        data: {
          owner: "0x1234567890123456789012345678901234567890",
          assets: [
            {
              blockchain: "eth",
              name: "Bored Ape #1234",
              tokenId: "1234",
              tokenUrl: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/1234",
              imageUrl: "ipfs://QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ",
              collectionName: "Bored Ape Yacht Club",
              symbol: "BAYC",
              contractType: "ERC721",
              contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d"
            },
            {
              blockchain: "eth",
              name: "CryptoPunk #5678",
              tokenId: "5678",
              tokenUrl: "https://cryptopunks.app/cryptopunks/details/5678",
              imageUrl: "https://cryptopunks.app/cryptopunks/image/5678",
              collectionName: "CryptoPunks",
              symbol: "PUNK",
              contractType: "ERC721",
              contractAddress: "0x2505...42a2"
            }
          ]
        }
      }
    }
  ]],
  // ------------------------------------------------------------------------------------------------
  // Core Validation implementation
  // ------------------------------------------------------------------------------------------------
  validate: async (_runtime, message) => {
    if (message.content?.type !== "GET_NFTS_BY_OWNER_ANKR") {
      return true;
    }
    logGranular13("Validating GET_NFTS_BY_OWNER_ANKR action", {
      content: message.content
    });
    try {
      const content = message.content;
      if (!content.filters?.blockchain || !content.filters?.walletAddress) {
        throw new ValidationError("Blockchain and wallet address are required");
      }
      if (content.filters?.blockchain && !Array.isArray(content.filters.blockchain)) {
        throw new ValidationError("Blockchain must be an array");
      }
      logGranular13("Validation successful");
      return true;
    } catch (error) {
      logGranular13("Validation failed", { error });
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(error instanceof Error ? error.message : "Unknown validation error");
    }
  },
  // ------------------------------------------------------------------------------------------------
  // Core Handler implementation
  // ------------------------------------------------------------------------------------------------
  handler: async (runtime, message, _state, _options = {}, callback) => {
    logGranular13("Executing GET_NFTS_BY_OWNER_ANKR action");
    try {
      const messageContent = message.content;
      console.log("Debug - Full message content:", {
        fullContent: message.content,
        rawText: messageContent?.text,
        type: message.content?.type
      });
      const config14 = await validateankrConfig(runtime);
      console.log("Debug - Config validated:", {
        hasWallet: !!config14.ANKR_WALLET,
        env: config14.ANKR_ENV
      });
      const wallet = config14.ANKR_WALLET;
      if (!wallet) {
        throw new ConfigurationError("ANKR_WALLET not found in environment variables");
      }
      const endpoint = `https://rpc.ankr.com/multichain/${wallet}`;
      const parsedContent = parseAPIContent(messageContent.text);
      console.log("Debug - Parsed API content:", {
        hasWallet: !!parsedContent.wallet,
        hasChain: !!parsedContent.chain,
        wallet: parsedContent.wallet,
        chain: parsedContent.chain,
        matches: parsedContent.raw.matches
      });
      validateRequiredFields(parsedContent, ["wallet", "chain"]);
      const requestParams = {
        blockchain: [parsedContent.chain],
        // API expects array
        walletAddress: parsedContent.wallet,
        pageSize: messageContent.filters?.pageSize ?? 10,
        pageToken: messageContent.filters?.pageToken
      };
      console.log("Debug - API request parameters:", requestParams);
      try {
        const response = await axios13.post(
          endpoint,
          {
            jsonrpc: "2.0",
            method: "ankr_getNFTsByOwner",
            params: requestParams,
            id: 1
          },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        logGranular13("Received response from Ankr API", {
          statusCode: response.status,
          data: response.data
        });
        if (response.data.error) {
          throw new APIError(`Ankr API error: ${response.data.error.message}`);
        }
        const { owner, assets, syncStatus } = response.data.result;
        let formattedText = `NFTs owned by ${owner}:

`;
        for (const [index, nft] of assets.entries()) {
          formattedText += `${index + 1}. ${nft.name || "Unnamed NFT"}
`;
          if (nft.collectionName) {
            formattedText += `   Collection: ${nft.collectionName}
`;
          }
          formattedText += `   Contract: ${nft.contractAddress.slice(0, 6)}...${nft.contractAddress.slice(-4)} (${nft.contractType})
`;
          formattedText += `   Token ID: ${nft.tokenId}
`;
          if (nft.quantity) {
            formattedText += `   Quantity: ${nft.quantity}
`;
          }
          if (nft.tokenUrl) {
            formattedText += `   Metadata URL: ${nft.tokenUrl}
`;
          }
          formattedText += "\n";
        }
        if (callback) {
          logGranular13("Sending success callback with formatted text", { formattedText });
          callback({
            text: formattedText,
            success: true,
            data: {
              owner,
              assets,
              syncStatus
            }
          });
        }
        return true;
      } catch (error) {
        logGranular13("API request failed", { error });
        if (axios13.isAxiosError(error)) {
          throw new APIError(
            `Failed to fetch NFTs data: ${error.message}`,
            error.response?.status
          );
        }
        throw new APIError("Failed to fetch NFTs data");
      }
    } catch (error) {
      logGranular13("Handler execution failed", { error });
      if (callback) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        callback({
          text: `Error getting NFTs: ${errorMessage}`,
          success: false
        });
      }
      if (error instanceof ConfigurationError || error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to execute GET_NFTS_BY_OWNER_ANKR action");
    }
  }
};

// src/index.ts
var spinner = ora({
  text: chalk.cyan("Initializing ANKR Plugin..."),
  spinner: "dots12",
  color: "cyan"
}).start();
var actions = [
  actionGetTokenHoldersCount,
  actionGetTokenPrice,
  actionGetTokenTransfers,
  actionGetAccountBalance,
  actionGetTransactionsByAddress,
  actionGetTransactionsByHash,
  actionGetBlockchainStats,
  actionGetCurrencies,
  actionGetInteractions,
  actionGetNFTHolders,
  actionGetNFTTransfers,
  actionGetNFTMetadata,
  actionGetNFTsByOwner
];
var ANKR_SPASH = getConfig().ANKR_WALLET;
if (ANKR_SPASH) {
  console.log(`
${chalk.cyan("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510")}`);
  console.log(chalk.cyan("\u2502") + chalk.yellow.bold("          ANKR PLUGIN             ") + chalk.cyan(" \u2502"));
  console.log(chalk.cyan("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"));
  console.log(chalk.cyan("\u2502") + chalk.white("  Initializing ANKR Services...    ") + chalk.cyan("\u2502"));
  console.log(chalk.cyan("\u2502") + chalk.white("  Version: 1.0.0                        ") + chalk.cyan("\u2502"));
  console.log(chalk.cyan("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"));
  spinner.succeed(chalk.green("ANKR Plugin initialized successfully!"));
  const actionTable = new Table({
    head: [
      chalk.cyan("Action"),
      chalk.cyan("H"),
      chalk.cyan("V"),
      chalk.cyan("E"),
      chalk.cyan("Similes")
    ],
    style: {
      head: [],
      border: ["cyan"]
    }
  });
  for (const action of actions) {
    actionTable.push([
      chalk.white(action.name),
      typeof action.handler === "function" ? chalk.green("\u2713") : chalk.red("\u2717"),
      typeof action.validate === "function" ? chalk.green("\u2713") : chalk.red("\u2717"),
      action.examples?.length > 0 ? chalk.green("\u2713") : chalk.red("\u2717"),
      chalk.gray(action.similes?.join(", ") || "none")
    ]);
  }
  console.log(`
${actionTable.toString()}`);
  const statusTable = new Table({
    style: {
      border: ["cyan"]
    }
  });
  statusTable.push(
    [chalk.cyan("Plugin Status")],
    [chalk.white("Name    : ") + chalk.yellow("plugin-ankr")],
    [chalk.white("Actions : ") + chalk.green(actions.length.toString())],
    [chalk.white("Status  : ") + chalk.green("Loaded & Ready")]
  );
  console.log(`
${statusTable.toString()}
`);
} else {
  spinner.stop();
}
var ankrPlugin = {
  name: "plugin-ankr",
  description: "Ankr Plugin for web3",
  actions,
  evaluators: []
};
var index_default = ankrPlugin;
export {
  ankrPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map