import {
  AbiDecodingDataSizeTooSmallError,
  AbiDecodingZeroDataError,
  AbiEventNotFoundError,
  AbiEventSignatureEmptyTopicsError,
  AbiEventSignatureNotFoundError,
  BaseError,
  BytesSizeMismatchError,
  CallExecutionError,
  ChainDisconnectedError,
  ChainMismatchError,
  ChainNotFoundError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  DecodeLogDataMismatch,
  DecodeLogTopicsMismatch,
  FeeCapTooHighError,
  HttpRequestError,
  InternalRpcError,
  InvalidAddressError,
  InvalidChainIdError,
  InvalidInputRpcError,
  InvalidLegacyVError,
  InvalidParamsRpcError,
  InvalidRequestRpcError,
  InvalidSerializableTransactionError,
  InvalidStorageKeySizeError,
  JsonRpcVersionUnsupportedError,
  LimitExceededRpcError,
  LruMap,
  MethodNotFoundRpcError,
  MethodNotSupportedRpcError,
  ParseRpcError,
  PositionOutOfBoundsError,
  ProviderDisconnectedError,
  RawContractError,
  ResourceNotFoundRpcError,
  ResourceUnavailableRpcError,
  RpcRequestError,
  SwitchChainError,
  TimeoutError,
  TipAboveFeeCapError,
  TransactionExecutionError,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  TransactionRejectedRpcError,
  UnauthorizedProviderError,
  UnknownNodeError,
  UnknownRpcError,
  UnsupportedProviderMethodError,
  UserRejectedRequestError,
  WaitForTransactionReceiptTimeoutError,
  addressResolverAbi,
  assertRequest,
  bytesRegex,
  bytesToHex,
  call,
  checksumAddress,
  concat,
  concatHex,
  createBatchScheduler,
  createCursor,
  decodeAbiParameters,
  decodeFunctionResult,
  defineFormatter,
  encodeAbiParameters,
  encodeDeployData,
  encodeFunctionData,
  extract,
  formatAbiItem,
  formatEther,
  formatGwei,
  formatTransactionRequest,
  formatUnits,
  getAbiItem,
  getAddress,
  getChainContractAddress,
  getNodeError,
  hexToBigInt,
  hexToBool,
  hexToBytes,
  hexToNumber,
  integerRegex,
  isAddress,
  isAddressEqual,
  isHex,
  keccak256,
  maxUint256,
  multicall3Abi,
  numberToHex,
  panicReasons,
  parseAccount,
  prettyPrint,
  serializeStateOverride,
  size,
  slice,
  sliceHex,
  stringToBytes,
  stringToHex,
  stringify,
  textResolverAbi,
  toBytes,
  toEventSelector,
  toHex,
  trim,
  universalResolverResolveAbi,
  universalResolverReverseAbi,
  universalSignatureValidatorAbi,
  universalSignatureValidatorByteCode,
  withResolvers
} from "./chunk-TKDWHZ6M.js";

// src/providers/curves.ts
import {
  elizaLogger
} from "@elizaos/core";

// ../../node_modules/viem/_esm/index.js
import { CircularReferenceError, InvalidAbiParameterError, InvalidAbiParametersError, InvalidAbiItemError, InvalidAbiTypeParameterError, InvalidFunctionModifierError, InvalidModifierError, InvalidParameterError, InvalidParenthesisError, InvalidSignatureError, InvalidStructSignatureError, SolidityProtectedKeywordError, UnknownTypeError, UnknownSignatureError, parseAbi as parseAbi2, parseAbiItem as parseAbiItem2, parseAbiParameter as parseAbiParameter2, parseAbiParameters as parseAbiParameters2 } from "abitype";

// ../../node_modules/viem/_esm/utils/getAction.js
function getAction(client, actionFn, name) {
  const action_implicit = client[actionFn.name];
  if (typeof action_implicit === "function")
    return action_implicit;
  const action_explicit = client[name];
  if (typeof action_explicit === "function")
    return action_explicit;
  return (params) => actionFn(client, params);
}

// ../../node_modules/viem/_esm/errors/log.js
var FilterTypeNotSupportedError = class extends BaseError {
  constructor(type) {
    super(`Filter type "${type}" is not supported.`, {
      name: "FilterTypeNotSupportedError"
    });
  }
};

// ../../node_modules/viem/_esm/utils/abi/encodeEventTopics.js
var docsPath = "/docs/contract/encodeEventTopics";
function encodeEventTopics(parameters) {
  const { abi: abi2, eventName, args } = parameters;
  let abiItem = abi2[0];
  if (eventName) {
    const item = getAbiItem({ abi: abi2, name: eventName });
    if (!item)
      throw new AbiEventNotFoundError(eventName, { docsPath });
    abiItem = item;
  }
  if (abiItem.type !== "event")
    throw new AbiEventNotFoundError(void 0, { docsPath });
  const definition = formatAbiItem(abiItem);
  const signature = toEventSelector(definition);
  let topics = [];
  if (args && "inputs" in abiItem) {
    const indexedInputs = abiItem.inputs?.filter((param) => "indexed" in param && param.indexed);
    const args_ = Array.isArray(args) ? args : Object.values(args).length > 0 ? indexedInputs?.map((x) => args[x.name]) ?? [] : [];
    if (args_.length > 0) {
      topics = indexedInputs?.map((param, i) => {
        if (Array.isArray(args_[i]))
          return args_[i].map((_, j) => encodeArg({ param, value: args_[i][j] }));
        return args_[i] ? encodeArg({ param, value: args_[i] }) : null;
      }) ?? [];
    }
  }
  return [signature, ...topics];
}
function encodeArg({ param, value }) {
  if (param.type === "string" || param.type === "bytes")
    return keccak256(toBytes(value));
  if (param.type === "tuple" || param.type.match(/^(.*)\[(\d+)?\]$/))
    throw new FilterTypeNotSupportedError(param.type);
  return encodeAbiParameters([param], [value]);
}

// ../../node_modules/viem/_esm/utils/filters/createFilterRequestScope.js
function createFilterRequestScope(client, { method }) {
  const requestMap = {};
  if (client.transport.type === "fallback")
    client.transport.onResponse?.(({ method: method_, response: id, status, transport }) => {
      if (status === "success" && method === method_)
        requestMap[id] = transport.request;
    });
  return (id) => requestMap[id] || client.request;
}

// ../../node_modules/viem/_esm/actions/public/createContractEventFilter.js
async function createContractEventFilter(client, parameters) {
  const { address, abi: abi2, args, eventName, fromBlock, strict, toBlock } = parameters;
  const getRequest = createFilterRequestScope(client, {
    method: "eth_newFilter"
  });
  const topics = eventName ? encodeEventTopics({
    abi: abi2,
    args,
    eventName
  }) : void 0;
  const id = await client.request({
    method: "eth_newFilter",
    params: [
      {
        address,
        fromBlock: typeof fromBlock === "bigint" ? numberToHex(fromBlock) : fromBlock,
        toBlock: typeof toBlock === "bigint" ? numberToHex(toBlock) : toBlock,
        topics
      }
    ]
  });
  return {
    abi: abi2,
    args,
    eventName,
    id,
    request: getRequest(id),
    strict: Boolean(strict),
    type: "event"
  };
}

// ../../node_modules/viem/_esm/utils/errors/getContractError.js
var EXECUTION_REVERTED_ERROR_CODE = 3;
function getContractError(err, { abi: abi2, address, args, docsPath: docsPath3, functionName, sender }) {
  const error = err instanceof RawContractError ? err : err instanceof BaseError ? err.walk((err2) => "data" in err2) || err.walk() : {};
  const { code, data, details, message, shortMessage } = error;
  const cause = (() => {
    if (err instanceof AbiDecodingZeroDataError)
      return new ContractFunctionZeroDataError({ functionName });
    if ([EXECUTION_REVERTED_ERROR_CODE, InternalRpcError.code].includes(code) && (data || details || message || shortMessage)) {
      return new ContractFunctionRevertedError({
        abi: abi2,
        data: typeof data === "object" ? data.data : data,
        functionName,
        message: error instanceof RpcRequestError ? details : shortMessage ?? message
      });
    }
    return err;
  })();
  return new ContractFunctionExecutionError(cause, {
    abi: abi2,
    args,
    contractAddress: address,
    docsPath: docsPath3,
    functionName,
    sender
  });
}

// ../../node_modules/viem/_esm/accounts/utils/publicKeyToAddress.js
function publicKeyToAddress(publicKey) {
  const address = keccak256(`0x${publicKey.substring(4)}`).substring(26);
  return checksumAddress(`0x${address}`);
}

// ../../node_modules/viem/_esm/utils/signature/recoverPublicKey.js
async function recoverPublicKey({ hash, signature }) {
  const hashHex = isHex(hash) ? hash : toHex(hash);
  const { secp256k1: secp256k14 } = await import("@noble/curves/secp256k1");
  const signature_ = (() => {
    if (typeof signature === "object" && "r" in signature && "s" in signature) {
      const { r, s, v, yParity } = signature;
      const yParityOrV2 = Number(yParity ?? v);
      const recoveryBit2 = toRecoveryBit(yParityOrV2);
      return new secp256k14.Signature(hexToBigInt(r), hexToBigInt(s)).addRecoveryBit(recoveryBit2);
    }
    const signatureHex = isHex(signature) ? signature : toHex(signature);
    const yParityOrV = hexToNumber(`0x${signatureHex.slice(130)}`);
    const recoveryBit = toRecoveryBit(yParityOrV);
    return secp256k14.Signature.fromCompact(signatureHex.substring(2, 130)).addRecoveryBit(recoveryBit);
  })();
  const publicKey = signature_.recoverPublicKey(hashHex.substring(2)).toHex(false);
  return `0x${publicKey}`;
}
function toRecoveryBit(yParityOrV) {
  if (yParityOrV === 0 || yParityOrV === 1)
    return yParityOrV;
  if (yParityOrV === 27)
    return 0;
  if (yParityOrV === 28)
    return 1;
  throw new Error("Invalid yParityOrV value");
}

// ../../node_modules/viem/_esm/utils/signature/recoverAddress.js
async function recoverAddress({ hash, signature }) {
  return publicKeyToAddress(await recoverPublicKey({ hash, signature }));
}

// ../../node_modules/viem/_esm/utils/encoding/toRlp.js
function toRlp(bytes, to = "hex") {
  const encodable = getEncodable(bytes);
  const cursor = createCursor(new Uint8Array(encodable.length));
  encodable.encode(cursor);
  if (to === "hex")
    return bytesToHex(cursor.bytes);
  return cursor.bytes;
}
function getEncodable(bytes) {
  if (Array.isArray(bytes))
    return getEncodableList(bytes.map((x) => getEncodable(x)));
  return getEncodableBytes(bytes);
}
function getEncodableList(list) {
  const bodyLength = list.reduce((acc, x) => acc + x.length, 0);
  const sizeOfBodyLength = getSizeOfLength(bodyLength);
  const length = (() => {
    if (bodyLength <= 55)
      return 1 + bodyLength;
    return 1 + sizeOfBodyLength + bodyLength;
  })();
  return {
    length,
    encode(cursor) {
      if (bodyLength <= 55) {
        cursor.pushByte(192 + bodyLength);
      } else {
        cursor.pushByte(192 + 55 + sizeOfBodyLength);
        if (sizeOfBodyLength === 1)
          cursor.pushUint8(bodyLength);
        else if (sizeOfBodyLength === 2)
          cursor.pushUint16(bodyLength);
        else if (sizeOfBodyLength === 3)
          cursor.pushUint24(bodyLength);
        else
          cursor.pushUint32(bodyLength);
      }
      for (const { encode } of list) {
        encode(cursor);
      }
    }
  };
}
function getEncodableBytes(bytesOrHex) {
  const bytes = typeof bytesOrHex === "string" ? hexToBytes(bytesOrHex) : bytesOrHex;
  const sizeOfBytesLength = getSizeOfLength(bytes.length);
  const length = (() => {
    if (bytes.length === 1 && bytes[0] < 128)
      return 1;
    if (bytes.length <= 55)
      return 1 + bytes.length;
    return 1 + sizeOfBytesLength + bytes.length;
  })();
  return {
    length,
    encode(cursor) {
      if (bytes.length === 1 && bytes[0] < 128) {
        cursor.pushBytes(bytes);
      } else if (bytes.length <= 55) {
        cursor.pushByte(128 + bytes.length);
        cursor.pushBytes(bytes);
      } else {
        cursor.pushByte(128 + 55 + sizeOfBytesLength);
        if (sizeOfBytesLength === 1)
          cursor.pushUint8(bytes.length);
        else if (sizeOfBytesLength === 2)
          cursor.pushUint16(bytes.length);
        else if (sizeOfBytesLength === 3)
          cursor.pushUint24(bytes.length);
        else
          cursor.pushUint32(bytes.length);
        cursor.pushBytes(bytes);
      }
    }
  };
}
function getSizeOfLength(length) {
  if (length < 2 ** 8)
    return 1;
  if (length < 2 ** 16)
    return 2;
  if (length < 2 ** 24)
    return 3;
  if (length < 2 ** 32)
    return 4;
  throw new BaseError("Length is too large.");
}

// ../../node_modules/viem/_esm/experimental/eip7702/utils/hashAuthorization.js
function hashAuthorization(parameters) {
  const { chainId, contractAddress, nonce, to } = parameters;
  const hash = keccak256(concatHex([
    "0x05",
    toRlp([
      chainId ? numberToHex(chainId) : "0x",
      contractAddress,
      nonce ? numberToHex(nonce) : "0x"
    ])
  ]));
  if (to === "bytes")
    return hexToBytes(hash);
  return hash;
}

// ../../node_modules/viem/_esm/experimental/eip7702/utils/recoverAuthorizationAddress.js
async function recoverAuthorizationAddress(parameters) {
  const { authorization, signature } = parameters;
  return recoverAddress({
    hash: hashAuthorization(authorization),
    signature: signature ?? authorization
  });
}

// ../../node_modules/viem/_esm/errors/estimateGas.js
var EstimateGasExecutionError = class extends BaseError {
  constructor(cause, { account, docsPath: docsPath3, chain, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value }) {
    const prettyArgs = prettyPrint({
      from: account?.address,
      to,
      value: typeof value !== "undefined" && `${formatEther(value)} ${chain?.nativeCurrency?.symbol || "ETH"}`,
      data,
      gas,
      gasPrice: typeof gasPrice !== "undefined" && `${formatGwei(gasPrice)} gwei`,
      maxFeePerGas: typeof maxFeePerGas !== "undefined" && `${formatGwei(maxFeePerGas)} gwei`,
      maxPriorityFeePerGas: typeof maxPriorityFeePerGas !== "undefined" && `${formatGwei(maxPriorityFeePerGas)} gwei`,
      nonce
    });
    super(cause.shortMessage, {
      cause,
      docsPath: docsPath3,
      metaMessages: [
        ...cause.metaMessages ? [...cause.metaMessages, " "] : [],
        "Estimate Gas Arguments:",
        prettyArgs
      ].filter(Boolean),
      name: "EstimateGasExecutionError"
    });
    Object.defineProperty(this, "cause", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.cause = cause;
  }
};

// ../../node_modules/viem/_esm/utils/errors/getEstimateGasError.js
function getEstimateGasError(err, { docsPath: docsPath3, ...args }) {
  const cause = (() => {
    const cause2 = getNodeError(err, args);
    if (cause2 instanceof UnknownNodeError)
      return err;
    return cause2;
  })();
  return new EstimateGasExecutionError(cause, {
    docsPath: docsPath3,
    ...args
  });
}

// ../../node_modules/viem/_esm/errors/fee.js
var BaseFeeScalarError = class extends BaseError {
  constructor() {
    super("`baseFeeMultiplier` must be greater than 1.", {
      name: "BaseFeeScalarError"
    });
  }
};
var Eip1559FeesNotSupportedError = class extends BaseError {
  constructor() {
    super("Chain does not support EIP-1559 fees.", {
      name: "Eip1559FeesNotSupportedError"
    });
  }
};
var MaxFeePerGasTooLowError = class extends BaseError {
  constructor({ maxPriorityFeePerGas }) {
    super(`\`maxFeePerGas\` cannot be less than the \`maxPriorityFeePerGas\` (${formatGwei(maxPriorityFeePerGas)} gwei).`, { name: "MaxFeePerGasTooLowError" });
  }
};

// ../../node_modules/viem/_esm/errors/block.js
var BlockNotFoundError = class extends BaseError {
  constructor({ blockHash, blockNumber }) {
    let identifier = "Block";
    if (blockHash)
      identifier = `Block at hash "${blockHash}"`;
    if (blockNumber)
      identifier = `Block at number "${blockNumber}"`;
    super(`${identifier} could not be found.`, { name: "BlockNotFoundError" });
  }
};

// ../../node_modules/viem/_esm/utils/formatters/transaction.js
var transactionType = {
  "0x0": "legacy",
  "0x1": "eip2930",
  "0x2": "eip1559",
  "0x3": "eip4844",
  "0x4": "eip7702"
};
function formatTransaction(transaction) {
  const transaction_ = {
    ...transaction,
    blockHash: transaction.blockHash ? transaction.blockHash : null,
    blockNumber: transaction.blockNumber ? BigInt(transaction.blockNumber) : null,
    chainId: transaction.chainId ? hexToNumber(transaction.chainId) : void 0,
    gas: transaction.gas ? BigInt(transaction.gas) : void 0,
    gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : void 0,
    maxFeePerBlobGas: transaction.maxFeePerBlobGas ? BigInt(transaction.maxFeePerBlobGas) : void 0,
    maxFeePerGas: transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : void 0,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? BigInt(transaction.maxPriorityFeePerGas) : void 0,
    nonce: transaction.nonce ? hexToNumber(transaction.nonce) : void 0,
    to: transaction.to ? transaction.to : null,
    transactionIndex: transaction.transactionIndex ? Number(transaction.transactionIndex) : null,
    type: transaction.type ? transactionType[transaction.type] : void 0,
    typeHex: transaction.type ? transaction.type : void 0,
    value: transaction.value ? BigInt(transaction.value) : void 0,
    v: transaction.v ? BigInt(transaction.v) : void 0
  };
  if (transaction.authorizationList)
    transaction_.authorizationList = formatAuthorizationList(transaction.authorizationList);
  transaction_.yParity = (() => {
    if (transaction.yParity)
      return Number(transaction.yParity);
    if (typeof transaction_.v === "bigint") {
      if (transaction_.v === 0n || transaction_.v === 27n)
        return 0;
      if (transaction_.v === 1n || transaction_.v === 28n)
        return 1;
      if (transaction_.v >= 35n)
        return transaction_.v % 2n === 0n ? 1 : 0;
    }
    return void 0;
  })();
  if (transaction_.type === "legacy") {
    delete transaction_.accessList;
    delete transaction_.maxFeePerBlobGas;
    delete transaction_.maxFeePerGas;
    delete transaction_.maxPriorityFeePerGas;
    delete transaction_.yParity;
  }
  if (transaction_.type === "eip2930") {
    delete transaction_.maxFeePerBlobGas;
    delete transaction_.maxFeePerGas;
    delete transaction_.maxPriorityFeePerGas;
  }
  if (transaction_.type === "eip1559") {
    delete transaction_.maxFeePerBlobGas;
  }
  return transaction_;
}
var defineTransaction = /* @__PURE__ */ defineFormatter("transaction", formatTransaction);
function formatAuthorizationList(authorizationList) {
  return authorizationList.map((authorization) => ({
    contractAddress: authorization.address,
    chainId: Number(authorization.chainId),
    nonce: Number(authorization.nonce),
    r: authorization.r,
    s: authorization.s,
    yParity: Number(authorization.yParity)
  }));
}

// ../../node_modules/viem/_esm/utils/formatters/block.js
function formatBlock(block) {
  const transactions = (block.transactions ?? []).map((transaction) => {
    if (typeof transaction === "string")
      return transaction;
    return formatTransaction(transaction);
  });
  return {
    ...block,
    baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas) : null,
    blobGasUsed: block.blobGasUsed ? BigInt(block.blobGasUsed) : void 0,
    difficulty: block.difficulty ? BigInt(block.difficulty) : void 0,
    excessBlobGas: block.excessBlobGas ? BigInt(block.excessBlobGas) : void 0,
    gasLimit: block.gasLimit ? BigInt(block.gasLimit) : void 0,
    gasUsed: block.gasUsed ? BigInt(block.gasUsed) : void 0,
    hash: block.hash ? block.hash : null,
    logsBloom: block.logsBloom ? block.logsBloom : null,
    nonce: block.nonce ? block.nonce : null,
    number: block.number ? BigInt(block.number) : null,
    size: block.size ? BigInt(block.size) : void 0,
    timestamp: block.timestamp ? BigInt(block.timestamp) : void 0,
    transactions,
    totalDifficulty: block.totalDifficulty ? BigInt(block.totalDifficulty) : null
  };
}
var defineBlock = /* @__PURE__ */ defineFormatter("block", formatBlock);

// ../../node_modules/viem/_esm/actions/public/getBlock.js
async function getBlock(client, { blockHash, blockNumber, blockTag: blockTag_, includeTransactions: includeTransactions_ } = {}) {
  const blockTag = blockTag_ ?? "latest";
  const includeTransactions = includeTransactions_ ?? false;
  const blockNumberHex = blockNumber !== void 0 ? numberToHex(blockNumber) : void 0;
  let block = null;
  if (blockHash) {
    block = await client.request({
      method: "eth_getBlockByHash",
      params: [blockHash, includeTransactions]
    }, { dedupe: true });
  } else {
    block = await client.request({
      method: "eth_getBlockByNumber",
      params: [blockNumberHex || blockTag, includeTransactions]
    }, { dedupe: Boolean(blockNumberHex) });
  }
  if (!block)
    throw new BlockNotFoundError({ blockHash, blockNumber });
  const format = client.chain?.formatters?.block?.format || formatBlock;
  return format(block);
}

// ../../node_modules/viem/_esm/actions/public/getGasPrice.js
async function getGasPrice(client) {
  const gasPrice = await client.request({
    method: "eth_gasPrice"
  });
  return BigInt(gasPrice);
}

// ../../node_modules/viem/_esm/actions/public/estimateMaxPriorityFeePerGas.js
async function estimateMaxPriorityFeePerGas(client, args) {
  return internal_estimateMaxPriorityFeePerGas(client, args);
}
async function internal_estimateMaxPriorityFeePerGas(client, args) {
  const { block: block_, chain = client.chain, request } = args || {};
  try {
    const maxPriorityFeePerGas = chain?.fees?.maxPriorityFeePerGas ?? chain?.fees?.defaultPriorityFee;
    if (typeof maxPriorityFeePerGas === "function") {
      const block = block_ || await getAction(client, getBlock, "getBlock")({});
      const maxPriorityFeePerGas_ = await maxPriorityFeePerGas({
        block,
        client,
        request
      });
      if (maxPriorityFeePerGas_ === null)
        throw new Error();
      return maxPriorityFeePerGas_;
    }
    if (typeof maxPriorityFeePerGas !== "undefined")
      return maxPriorityFeePerGas;
    const maxPriorityFeePerGasHex = await client.request({
      method: "eth_maxPriorityFeePerGas"
    });
    return hexToBigInt(maxPriorityFeePerGasHex);
  } catch {
    const [block, gasPrice] = await Promise.all([
      block_ ? Promise.resolve(block_) : getAction(client, getBlock, "getBlock")({}),
      getAction(client, getGasPrice, "getGasPrice")({})
    ]);
    if (typeof block.baseFeePerGas !== "bigint")
      throw new Eip1559FeesNotSupportedError();
    const maxPriorityFeePerGas = gasPrice - block.baseFeePerGas;
    if (maxPriorityFeePerGas < 0n)
      return 0n;
    return maxPriorityFeePerGas;
  }
}

// ../../node_modules/viem/_esm/actions/public/estimateFeesPerGas.js
async function estimateFeesPerGas(client, args) {
  return internal_estimateFeesPerGas(client, args);
}
async function internal_estimateFeesPerGas(client, args) {
  const { block: block_, chain = client.chain, request, type = "eip1559" } = args || {};
  const baseFeeMultiplier = await (async () => {
    if (typeof chain?.fees?.baseFeeMultiplier === "function")
      return chain.fees.baseFeeMultiplier({
        block: block_,
        client,
        request
      });
    return chain?.fees?.baseFeeMultiplier ?? 1.2;
  })();
  if (baseFeeMultiplier < 1)
    throw new BaseFeeScalarError();
  const decimals = baseFeeMultiplier.toString().split(".")[1]?.length ?? 0;
  const denominator = 10 ** decimals;
  const multiply = (base) => base * BigInt(Math.ceil(baseFeeMultiplier * denominator)) / BigInt(denominator);
  const block = block_ ? block_ : await getAction(client, getBlock, "getBlock")({});
  if (typeof chain?.fees?.estimateFeesPerGas === "function") {
    const fees = await chain.fees.estimateFeesPerGas({
      block: block_,
      client,
      multiply,
      request,
      type
    });
    if (fees !== null)
      return fees;
  }
  if (type === "eip1559") {
    if (typeof block.baseFeePerGas !== "bigint")
      throw new Eip1559FeesNotSupportedError();
    const maxPriorityFeePerGas = typeof request?.maxPriorityFeePerGas === "bigint" ? request.maxPriorityFeePerGas : await internal_estimateMaxPriorityFeePerGas(client, {
      block,
      chain,
      request
    });
    const baseFeePerGas = multiply(block.baseFeePerGas);
    const maxFeePerGas = request?.maxFeePerGas ?? baseFeePerGas + maxPriorityFeePerGas;
    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  }
  const gasPrice = request?.gasPrice ?? multiply(await getAction(client, getGasPrice, "getGasPrice")({}));
  return {
    gasPrice
  };
}

// ../../node_modules/viem/_esm/actions/public/getTransactionCount.js
async function getTransactionCount(client, { address, blockTag = "latest", blockNumber }) {
  const count = await client.request({
    method: "eth_getTransactionCount",
    params: [address, blockNumber ? numberToHex(blockNumber) : blockTag]
  }, { dedupe: Boolean(blockNumber) });
  return hexToNumber(count);
}

// ../../node_modules/viem/_esm/utils/blob/blobsToCommitments.js
function blobsToCommitments(parameters) {
  const { kzg } = parameters;
  const to = parameters.to ?? (typeof parameters.blobs[0] === "string" ? "hex" : "bytes");
  const blobs = typeof parameters.blobs[0] === "string" ? parameters.blobs.map((x) => hexToBytes(x)) : parameters.blobs;
  const commitments = [];
  for (const blob of blobs)
    commitments.push(Uint8Array.from(kzg.blobToKzgCommitment(blob)));
  return to === "bytes" ? commitments : commitments.map((x) => bytesToHex(x));
}

// ../../node_modules/viem/_esm/utils/blob/blobsToProofs.js
function blobsToProofs(parameters) {
  const { kzg } = parameters;
  const to = parameters.to ?? (typeof parameters.blobs[0] === "string" ? "hex" : "bytes");
  const blobs = typeof parameters.blobs[0] === "string" ? parameters.blobs.map((x) => hexToBytes(x)) : parameters.blobs;
  const commitments = typeof parameters.commitments[0] === "string" ? parameters.commitments.map((x) => hexToBytes(x)) : parameters.commitments;
  const proofs = [];
  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const commitment = commitments[i];
    proofs.push(Uint8Array.from(kzg.computeBlobKzgProof(blob, commitment)));
  }
  return to === "bytes" ? proofs : proofs.map((x) => bytesToHex(x));
}

// ../../node_modules/viem/_esm/utils/hash/sha256.js
import { sha256 as noble_sha256 } from "@noble/hashes/sha256";
function sha256(value, to_) {
  const to = to_ || "hex";
  const bytes = noble_sha256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}

// ../../node_modules/viem/_esm/utils/blob/commitmentToVersionedHash.js
function commitmentToVersionedHash(parameters) {
  const { commitment, version = 1 } = parameters;
  const to = parameters.to ?? (typeof commitment === "string" ? "hex" : "bytes");
  const versionedHash = sha256(commitment, "bytes");
  versionedHash.set([version], 0);
  return to === "bytes" ? versionedHash : bytesToHex(versionedHash);
}

// ../../node_modules/viem/_esm/utils/blob/commitmentsToVersionedHashes.js
function commitmentsToVersionedHashes(parameters) {
  const { commitments, version } = parameters;
  const to = parameters.to ?? (typeof commitments[0] === "string" ? "hex" : "bytes");
  const hashes = [];
  for (const commitment of commitments) {
    hashes.push(commitmentToVersionedHash({
      commitment,
      to,
      version
    }));
  }
  return hashes;
}

// ../../node_modules/viem/_esm/constants/blob.js
var blobsPerTransaction = 6;
var bytesPerFieldElement = 32;
var fieldElementsPerBlob = 4096;
var bytesPerBlob = bytesPerFieldElement * fieldElementsPerBlob;
var maxBytesPerTransaction = bytesPerBlob * blobsPerTransaction - // terminator byte (0x80).
1 - // zero byte (0x00) appended to each field element.
1 * fieldElementsPerBlob * blobsPerTransaction;

// ../../node_modules/viem/_esm/constants/kzg.js
var versionedHashVersionKzg = 1;

// ../../node_modules/viem/_esm/errors/blob.js
var BlobSizeTooLargeError = class extends BaseError {
  constructor({ maxSize, size: size3 }) {
    super("Blob size is too large.", {
      metaMessages: [`Max: ${maxSize} bytes`, `Given: ${size3} bytes`],
      name: "BlobSizeTooLargeError"
    });
  }
};
var EmptyBlobError = class extends BaseError {
  constructor() {
    super("Blob data must not be empty.", { name: "EmptyBlobError" });
  }
};
var InvalidVersionedHashSizeError = class extends BaseError {
  constructor({ hash, size: size3 }) {
    super(`Versioned hash "${hash}" size is invalid.`, {
      metaMessages: ["Expected: 32", `Received: ${size3}`],
      name: "InvalidVersionedHashSizeError"
    });
  }
};
var InvalidVersionedHashVersionError = class extends BaseError {
  constructor({ hash, version }) {
    super(`Versioned hash "${hash}" version is invalid.`, {
      metaMessages: [
        `Expected: ${versionedHashVersionKzg}`,
        `Received: ${version}`
      ],
      name: "InvalidVersionedHashVersionError"
    });
  }
};

// ../../node_modules/viem/_esm/utils/blob/toBlobs.js
function toBlobs(parameters) {
  const to = parameters.to ?? (typeof parameters.data === "string" ? "hex" : "bytes");
  const data = typeof parameters.data === "string" ? hexToBytes(parameters.data) : parameters.data;
  const size_ = size(data);
  if (!size_)
    throw new EmptyBlobError();
  if (size_ > maxBytesPerTransaction)
    throw new BlobSizeTooLargeError({
      maxSize: maxBytesPerTransaction,
      size: size_
    });
  const blobs = [];
  let active = true;
  let position = 0;
  while (active) {
    const blob = createCursor(new Uint8Array(bytesPerBlob));
    let size3 = 0;
    while (size3 < fieldElementsPerBlob) {
      const bytes = data.slice(position, position + (bytesPerFieldElement - 1));
      blob.pushByte(0);
      blob.pushBytes(bytes);
      if (bytes.length < 31) {
        blob.pushByte(128);
        active = false;
        break;
      }
      size3++;
      position += 31;
    }
    blobs.push(blob);
  }
  return to === "bytes" ? blobs.map((x) => x.bytes) : blobs.map((x) => bytesToHex(x.bytes));
}

// ../../node_modules/viem/_esm/utils/blob/toBlobSidecars.js
function toBlobSidecars(parameters) {
  const { data, kzg, to } = parameters;
  const blobs = parameters.blobs ?? toBlobs({ data, to });
  const commitments = parameters.commitments ?? blobsToCommitments({ blobs, kzg, to });
  const proofs = parameters.proofs ?? blobsToProofs({ blobs, commitments, kzg, to });
  const sidecars = [];
  for (let i = 0; i < blobs.length; i++)
    sidecars.push({
      blob: blobs[i],
      commitment: commitments[i],
      proof: proofs[i]
    });
  return sidecars;
}

// ../../node_modules/viem/_esm/utils/transaction/getTransactionType.js
function getTransactionType(transaction) {
  if (transaction.type)
    return transaction.type;
  if (typeof transaction.authorizationList !== "undefined")
    return "eip7702";
  if (typeof transaction.blobs !== "undefined" || typeof transaction.blobVersionedHashes !== "undefined" || typeof transaction.maxFeePerBlobGas !== "undefined" || typeof transaction.sidecars !== "undefined")
    return "eip4844";
  if (typeof transaction.maxFeePerGas !== "undefined" || typeof transaction.maxPriorityFeePerGas !== "undefined") {
    return "eip1559";
  }
  if (typeof transaction.gasPrice !== "undefined") {
    if (typeof transaction.accessList !== "undefined")
      return "eip2930";
    return "legacy";
  }
  throw new InvalidSerializableTransactionError({ transaction });
}

// ../../node_modules/viem/_esm/actions/public/getChainId.js
async function getChainId(client) {
  const chainIdHex = await client.request({
    method: "eth_chainId"
  }, { dedupe: true });
  return hexToNumber(chainIdHex);
}

// ../../node_modules/viem/_esm/actions/wallet/prepareTransactionRequest.js
var defaultParameters = [
  "blobVersionedHashes",
  "chainId",
  "fees",
  "gas",
  "nonce",
  "type"
];
async function prepareTransactionRequest(client, args) {
  const { account: account_ = client.account, blobs, chain, gas, kzg, nonce, nonceManager, parameters = defaultParameters, type } = args;
  const account = account_ ? parseAccount(account_) : account_;
  const request = { ...args, ...account ? { from: account?.address } : {} };
  let block;
  async function getBlock2() {
    if (block)
      return block;
    block = await getAction(client, getBlock, "getBlock")({ blockTag: "latest" });
    return block;
  }
  let chainId;
  async function getChainId2() {
    if (chainId)
      return chainId;
    if (chain)
      return chain.id;
    if (typeof args.chainId !== "undefined")
      return args.chainId;
    const chainId_ = await getAction(client, getChainId, "getChainId")({});
    chainId = chainId_;
    return chainId;
  }
  if ((parameters.includes("blobVersionedHashes") || parameters.includes("sidecars")) && blobs && kzg) {
    const commitments = blobsToCommitments({ blobs, kzg });
    if (parameters.includes("blobVersionedHashes")) {
      const versionedHashes = commitmentsToVersionedHashes({
        commitments,
        to: "hex"
      });
      request.blobVersionedHashes = versionedHashes;
    }
    if (parameters.includes("sidecars")) {
      const proofs = blobsToProofs({ blobs, commitments, kzg });
      const sidecars = toBlobSidecars({
        blobs,
        commitments,
        proofs,
        to: "hex"
      });
      request.sidecars = sidecars;
    }
  }
  if (parameters.includes("chainId"))
    request.chainId = await getChainId2();
  if (parameters.includes("nonce") && typeof nonce === "undefined" && account) {
    if (nonceManager) {
      const chainId2 = await getChainId2();
      request.nonce = await nonceManager.consume({
        address: account.address,
        chainId: chainId2,
        client
      });
    } else {
      request.nonce = await getAction(client, getTransactionCount, "getTransactionCount")({
        address: account.address,
        blockTag: "pending"
      });
    }
  }
  if ((parameters.includes("fees") || parameters.includes("type")) && typeof type === "undefined") {
    try {
      request.type = getTransactionType(request);
    } catch {
      const block2 = await getBlock2();
      request.type = typeof block2?.baseFeePerGas === "bigint" ? "eip1559" : "legacy";
    }
  }
  if (parameters.includes("fees")) {
    if (request.type !== "legacy" && request.type !== "eip2930") {
      if (typeof request.maxFeePerGas === "undefined" || typeof request.maxPriorityFeePerGas === "undefined") {
        const block2 = await getBlock2();
        const { maxFeePerGas, maxPriorityFeePerGas } = await internal_estimateFeesPerGas(client, {
          block: block2,
          chain,
          request
        });
        if (typeof args.maxPriorityFeePerGas === "undefined" && args.maxFeePerGas && args.maxFeePerGas < maxPriorityFeePerGas)
          throw new MaxFeePerGasTooLowError({
            maxPriorityFeePerGas
          });
        request.maxPriorityFeePerGas = maxPriorityFeePerGas;
        request.maxFeePerGas = maxFeePerGas;
      }
    } else {
      if (typeof args.maxFeePerGas !== "undefined" || typeof args.maxPriorityFeePerGas !== "undefined")
        throw new Eip1559FeesNotSupportedError();
      const block2 = await getBlock2();
      const { gasPrice: gasPrice_ } = await internal_estimateFeesPerGas(client, {
        block: block2,
        chain,
        request,
        type: "legacy"
      });
      request.gasPrice = gasPrice_;
    }
  }
  if (parameters.includes("gas") && typeof gas === "undefined")
    request.gas = await getAction(client, estimateGas, "estimateGas")({
      ...request,
      account: account ? { address: account.address, type: "json-rpc" } : account
    });
  assertRequest(request);
  delete request.parameters;
  return request;
}

// ../../node_modules/viem/_esm/actions/public/getBalance.js
async function getBalance(client, { address, blockNumber, blockTag = "latest" }) {
  const blockNumberHex = blockNumber ? numberToHex(blockNumber) : void 0;
  const balance = await client.request({
    method: "eth_getBalance",
    params: [address, blockNumberHex || blockTag]
  });
  return BigInt(balance);
}

// ../../node_modules/viem/_esm/actions/public/estimateGas.js
async function estimateGas(client, args) {
  const { account: account_ = client.account } = args;
  const account = account_ ? parseAccount(account_) : void 0;
  try {
    let estimateGas_rpc = function(parameters) {
      const { block: block2, request: request2, rpcStateOverride: rpcStateOverride2 } = parameters;
      return client.request({
        method: "eth_estimateGas",
        params: rpcStateOverride2 ? [request2, block2 ?? "latest", rpcStateOverride2] : block2 ? [request2, block2] : [request2]
      });
    };
    const { accessList, authorizationList, blobs, blobVersionedHashes, blockNumber, blockTag, data, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, nonce, value, stateOverride, ...rest } = await prepareTransactionRequest(client, {
      ...args,
      parameters: (
        // Some RPC Providers do not compute versioned hashes from blobs. We will need
        // to compute them.
        account?.type === "local" ? void 0 : ["blobVersionedHashes"]
      )
    });
    const blockNumberHex = blockNumber ? numberToHex(blockNumber) : void 0;
    const block = blockNumberHex || blockTag;
    const rpcStateOverride = serializeStateOverride(stateOverride);
    const to = await (async () => {
      if (rest.to)
        return rest.to;
      if (authorizationList && authorizationList.length > 0)
        return await recoverAuthorizationAddress({
          authorization: authorizationList[0]
        }).catch(() => {
          throw new BaseError("`to` is required. Could not infer from `authorizationList`");
        });
      return void 0;
    })();
    assertRequest(args);
    const chainFormat = client.chain?.formatters?.transactionRequest?.format;
    const format = chainFormat || formatTransactionRequest;
    const request = format({
      // Pick out extra data that might exist on the chain's transaction request type.
      ...extract(rest, { format: chainFormat }),
      from: account?.address,
      accessList,
      authorizationList,
      blobs,
      blobVersionedHashes,
      data,
      gas,
      gasPrice,
      maxFeePerBlobGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      to,
      value
    });
    let estimate = BigInt(await estimateGas_rpc({ block, request, rpcStateOverride }));
    if (authorizationList) {
      const value2 = await getBalance(client, { address: request.from });
      const estimates = await Promise.all(authorizationList.map(async (authorization) => {
        const { contractAddress } = authorization;
        const estimate2 = await estimateGas_rpc({
          block,
          request: {
            authorizationList: void 0,
            data,
            from: account?.address,
            to: contractAddress,
            value: numberToHex(value2)
          },
          rpcStateOverride
        }).catch(() => 100000n);
        return 2n * BigInt(estimate2);
      }));
      estimate += estimates.reduce((acc, curr) => acc + curr, 0n);
    }
    return estimate;
  } catch (err) {
    throw getEstimateGasError(err, {
      ...args,
      account,
      chain: client.chain
    });
  }
}

// ../../node_modules/viem/_esm/actions/public/estimateContractGas.js
async function estimateContractGas(client, parameters) {
  const { abi: abi2, address, args, functionName, dataSuffix, ...request } = parameters;
  const data = encodeFunctionData({
    abi: abi2,
    args,
    functionName
  });
  try {
    const gas = await getAction(client, estimateGas, "estimateGas")({
      data: `${data}${dataSuffix ? dataSuffix.replace("0x", "") : ""}`,
      to: address,
      ...request
    });
    return gas;
  } catch (error) {
    const account = request.account ? parseAccount(request.account) : void 0;
    throw getContractError(error, {
      abi: abi2,
      address,
      args,
      docsPath: "/docs/contract/estimateContractGas",
      functionName,
      sender: account?.address
    });
  }
}

// ../../node_modules/viem/_esm/utils/abi/decodeEventLog.js
var docsPath2 = "/docs/contract/decodeEventLog";
function decodeEventLog(parameters) {
  const { abi: abi2, data, strict: strict_, topics } = parameters;
  const strict = strict_ ?? true;
  const [signature, ...argTopics] = topics;
  if (!signature)
    throw new AbiEventSignatureEmptyTopicsError({ docsPath: docsPath2 });
  const abiItem = (() => {
    if (abi2.length === 1)
      return abi2[0];
    return abi2.find((x) => x.type === "event" && signature === toEventSelector(formatAbiItem(x)));
  })();
  if (!(abiItem && "name" in abiItem) || abiItem.type !== "event")
    throw new AbiEventSignatureNotFoundError(signature, { docsPath: docsPath2 });
  const { name, inputs } = abiItem;
  const isUnnamed = inputs?.some((x) => !("name" in x && x.name));
  let args = isUnnamed ? [] : {};
  const indexedInputs = inputs.filter((x) => "indexed" in x && x.indexed);
  for (let i = 0; i < indexedInputs.length; i++) {
    const param = indexedInputs[i];
    const topic = argTopics[i];
    if (!topic)
      throw new DecodeLogTopicsMismatch({
        abiItem,
        param
      });
    args[isUnnamed ? i : param.name || i] = decodeTopic({ param, value: topic });
  }
  const nonIndexedInputs = inputs.filter((x) => !("indexed" in x && x.indexed));
  if (nonIndexedInputs.length > 0) {
    if (data && data !== "0x") {
      try {
        const decodedData = decodeAbiParameters(nonIndexedInputs, data);
        if (decodedData) {
          if (isUnnamed)
            args = [...args, ...decodedData];
          else {
            for (let i = 0; i < nonIndexedInputs.length; i++) {
              args[nonIndexedInputs[i].name] = decodedData[i];
            }
          }
        }
      } catch (err) {
        if (strict) {
          if (err instanceof AbiDecodingDataSizeTooSmallError || err instanceof PositionOutOfBoundsError)
            throw new DecodeLogDataMismatch({
              abiItem,
              data,
              params: nonIndexedInputs,
              size: size(data)
            });
          throw err;
        }
      }
    } else if (strict) {
      throw new DecodeLogDataMismatch({
        abiItem,
        data: "0x",
        params: nonIndexedInputs,
        size: 0
      });
    }
  }
  return {
    eventName: name,
    args: Object.values(args).length > 0 ? args : void 0
  };
}
function decodeTopic({ param, value }) {
  if (param.type === "string" || param.type === "bytes" || param.type === "tuple" || param.type.match(/^(.*)\[(\d+)?\]$/))
    return value;
  const decodedArg = decodeAbiParameters([param], value) || [];
  return decodedArg[0];
}

// ../../node_modules/viem/_esm/utils/abi/parseEventLogs.js
function parseEventLogs(parameters) {
  const { abi: abi2, args, logs, strict = true } = parameters;
  const eventName = (() => {
    if (!parameters.eventName)
      return void 0;
    if (Array.isArray(parameters.eventName))
      return parameters.eventName;
    return [parameters.eventName];
  })();
  return logs.map((log) => {
    try {
      const abiItem = abi2.find((abiItem2) => abiItem2.type === "event" && log.topics[0] === toEventSelector(abiItem2));
      if (!abiItem)
        return null;
      const event = decodeEventLog({
        ...log,
        abi: [abiItem],
        strict
      });
      if (eventName && !eventName.includes(event.eventName))
        return null;
      if (!includesArgs({
        args: event.args,
        inputs: abiItem.inputs,
        matchArgs: args
      }))
        return null;
      return { ...event, ...log };
    } catch (err) {
      let eventName2;
      let isUnnamed;
      if (err instanceof AbiEventSignatureNotFoundError)
        return null;
      if (err instanceof DecodeLogDataMismatch || err instanceof DecodeLogTopicsMismatch) {
        if (strict)
          return null;
        eventName2 = err.abiItem.name;
        isUnnamed = err.abiItem.inputs?.some((x) => !("name" in x && x.name));
      }
      return { ...log, args: isUnnamed ? [] : {}, eventName: eventName2 };
    }
  }).filter(Boolean);
}
function includesArgs(parameters) {
  const { args, inputs, matchArgs } = parameters;
  if (!matchArgs)
    return true;
  if (!args)
    return false;
  function isEqual(input, value, arg) {
    try {
      if (input.type === "address")
        return isAddressEqual(value, arg);
      if (input.type === "string" || input.type === "bytes")
        return keccak256(toBytes(value)) === arg;
      return value === arg;
    } catch {
      return false;
    }
  }
  if (Array.isArray(args) && Array.isArray(matchArgs)) {
    return matchArgs.every((value, index2) => {
      if (value === null || value === void 0)
        return true;
      const input = inputs[index2];
      if (!input)
        return false;
      const value_ = Array.isArray(value) ? value : [value];
      return value_.some((value2) => isEqual(input, value2, args[index2]));
    });
  }
  if (typeof args === "object" && !Array.isArray(args) && typeof matchArgs === "object" && !Array.isArray(matchArgs))
    return Object.entries(matchArgs).every(([key, value]) => {
      if (value === null || value === void 0)
        return true;
      const input = inputs.find((input2) => input2.name === key);
      if (!input)
        return false;
      const value_ = Array.isArray(value) ? value : [value];
      return value_.some((value2) => isEqual(input, value2, args[key]));
    });
  return false;
}

// ../../node_modules/viem/_esm/utils/formatters/log.js
function formatLog(log, { args, eventName } = {}) {
  return {
    ...log,
    blockHash: log.blockHash ? log.blockHash : null,
    blockNumber: log.blockNumber ? BigInt(log.blockNumber) : null,
    logIndex: log.logIndex ? Number(log.logIndex) : null,
    transactionHash: log.transactionHash ? log.transactionHash : null,
    transactionIndex: log.transactionIndex ? Number(log.transactionIndex) : null,
    ...eventName ? { args, eventName } : {}
  };
}

// ../../node_modules/viem/_esm/actions/public/getLogs.js
async function getLogs(client, { address, blockHash, fromBlock, toBlock, event, events: events_, args, strict: strict_ } = {}) {
  const strict = strict_ ?? false;
  const events = events_ ?? (event ? [event] : void 0);
  let topics = [];
  if (events) {
    const encoded = events.flatMap((event2) => encodeEventTopics({
      abi: [event2],
      eventName: event2.name,
      args: events_ ? void 0 : args
    }));
    topics = [encoded];
    if (event)
      topics = topics[0];
  }
  let logs;
  if (blockHash) {
    logs = await client.request({
      method: "eth_getLogs",
      params: [{ address, topics, blockHash }]
    });
  } else {
    logs = await client.request({
      method: "eth_getLogs",
      params: [
        {
          address,
          topics,
          fromBlock: typeof fromBlock === "bigint" ? numberToHex(fromBlock) : fromBlock,
          toBlock: typeof toBlock === "bigint" ? numberToHex(toBlock) : toBlock
        }
      ]
    });
  }
  const formattedLogs = logs.map((log) => formatLog(log));
  if (!events)
    return formattedLogs;
  return parseEventLogs({
    abi: events,
    args,
    logs: formattedLogs,
    strict
  });
}

// ../../node_modules/viem/_esm/actions/public/getContractEvents.js
async function getContractEvents(client, parameters) {
  const { abi: abi2, address, args, blockHash, eventName, fromBlock, toBlock, strict } = parameters;
  const event = eventName ? getAbiItem({ abi: abi2, name: eventName }) : void 0;
  const events = !event ? abi2.filter((x) => x.type === "event") : void 0;
  return getAction(client, getLogs, "getLogs")({
    address,
    args,
    blockHash,
    event,
    events,
    fromBlock,
    toBlock,
    strict
  });
}

// ../../node_modules/viem/_esm/actions/public/readContract.js
async function readContract(client, parameters) {
  const { abi: abi2, address, args, functionName, ...rest } = parameters;
  const calldata = encodeFunctionData({
    abi: abi2,
    args,
    functionName
  });
  try {
    const { data } = await getAction(client, call, "call")({
      ...rest,
      data: calldata,
      to: address
    });
    return decodeFunctionResult({
      abi: abi2,
      args,
      functionName,
      data: data || "0x"
    });
  } catch (error) {
    throw getContractError(error, {
      abi: abi2,
      address,
      args,
      docsPath: "/docs/contract/readContract",
      functionName
    });
  }
}

// ../../node_modules/viem/_esm/actions/public/simulateContract.js
async function simulateContract(client, parameters) {
  const { abi: abi2, address, args, dataSuffix, functionName, ...callRequest } = parameters;
  const account = callRequest.account ? parseAccount(callRequest.account) : client.account;
  const calldata = encodeFunctionData({ abi: abi2, args, functionName });
  try {
    const { data } = await getAction(client, call, "call")({
      batch: false,
      data: `${calldata}${dataSuffix ? dataSuffix.replace("0x", "") : ""}`,
      to: address,
      ...callRequest,
      account
    });
    const result = decodeFunctionResult({
      abi: abi2,
      args,
      functionName,
      data: data || "0x"
    });
    const minimizedAbi = abi2.filter((abiItem) => "name" in abiItem && abiItem.name === parameters.functionName);
    return {
      result,
      request: {
        abi: minimizedAbi,
        address,
        args,
        dataSuffix,
        functionName,
        ...callRequest,
        account
      }
    };
  } catch (error) {
    throw getContractError(error, {
      abi: abi2,
      address,
      args,
      docsPath: "/docs/contract/simulateContract",
      functionName,
      sender: account?.address
    });
  }
}

// ../../node_modules/viem/_esm/utils/observe.js
var listenersCache = /* @__PURE__ */ new Map();
var cleanupCache = /* @__PURE__ */ new Map();
var callbackCount = 0;
function observe(observerId, callbacks, fn) {
  const callbackId = ++callbackCount;
  const getListeners = () => listenersCache.get(observerId) || [];
  const unsubscribe = () => {
    const listeners2 = getListeners();
    listenersCache.set(observerId, listeners2.filter((cb) => cb.id !== callbackId));
  };
  const unwatch = () => {
    const listeners2 = getListeners();
    if (!listeners2.some((cb) => cb.id === callbackId))
      return;
    const cleanup2 = cleanupCache.get(observerId);
    if (listeners2.length === 1 && cleanup2)
      cleanup2();
    unsubscribe();
  };
  const listeners = getListeners();
  listenersCache.set(observerId, [
    ...listeners,
    { id: callbackId, fns: callbacks }
  ]);
  if (listeners && listeners.length > 0)
    return unwatch;
  const emit = {};
  for (const key in callbacks) {
    emit[key] = (...args) => {
      const listeners2 = getListeners();
      if (listeners2.length === 0)
        return;
      for (const listener of listeners2)
        listener.fns[key]?.(...args);
    };
  }
  const cleanup = fn(emit);
  if (typeof cleanup === "function")
    cleanupCache.set(observerId, cleanup);
  return unwatch;
}

// ../../node_modules/viem/_esm/utils/wait.js
async function wait(time) {
  return new Promise((res) => setTimeout(res, time));
}

// ../../node_modules/viem/_esm/utils/poll.js
function poll(fn, { emitOnBegin, initialWaitTime, interval }) {
  let active = true;
  const unwatch = () => active = false;
  const watch = async () => {
    let data = void 0;
    if (emitOnBegin)
      data = await fn({ unpoll: unwatch });
    const initialWait = await initialWaitTime?.(data) ?? interval;
    await wait(initialWait);
    const poll2 = async () => {
      if (!active)
        return;
      await fn({ unpoll: unwatch });
      await wait(interval);
      poll2();
    };
    poll2();
  };
  watch();
  return unwatch;
}

// ../../node_modules/viem/_esm/utils/promise/withCache.js
var promiseCache = /* @__PURE__ */ new Map();
var responseCache = /* @__PURE__ */ new Map();
function getCache(cacheKey2) {
  const buildCache = (cacheKey3, cache) => ({
    clear: () => cache.delete(cacheKey3),
    get: () => cache.get(cacheKey3),
    set: (data) => cache.set(cacheKey3, data)
  });
  const promise = buildCache(cacheKey2, promiseCache);
  const response = buildCache(cacheKey2, responseCache);
  return {
    clear: () => {
      promise.clear();
      response.clear();
    },
    promise,
    response
  };
}
async function withCache(fn, { cacheKey: cacheKey2, cacheTime = Number.POSITIVE_INFINITY }) {
  const cache = getCache(cacheKey2);
  const response = cache.response.get();
  if (response && cacheTime > 0) {
    const age = (/* @__PURE__ */ new Date()).getTime() - response.created.getTime();
    if (age < cacheTime)
      return response.data;
  }
  let promise = cache.promise.get();
  if (!promise) {
    promise = fn();
    cache.promise.set(promise);
  }
  try {
    const data = await promise;
    cache.response.set({ created: /* @__PURE__ */ new Date(), data });
    return data;
  } finally {
    cache.promise.clear();
  }
}

// ../../node_modules/viem/_esm/actions/public/getBlockNumber.js
var cacheKey = (id) => `blockNumber.${id}`;
async function getBlockNumber(client, { cacheTime = client.cacheTime } = {}) {
  const blockNumberHex = await withCache(() => client.request({
    method: "eth_blockNumber"
  }), { cacheKey: cacheKey(client.uid), cacheTime });
  return BigInt(blockNumberHex);
}

// ../../node_modules/viem/_esm/actions/public/getFilterChanges.js
async function getFilterChanges(_client, { filter }) {
  const strict = "strict" in filter && filter.strict;
  const logs = await filter.request({
    method: "eth_getFilterChanges",
    params: [filter.id]
  });
  if (typeof logs[0] === "string")
    return logs;
  const formattedLogs = logs.map((log) => formatLog(log));
  if (!("abi" in filter) || !filter.abi)
    return formattedLogs;
  return parseEventLogs({
    abi: filter.abi,
    logs: formattedLogs,
    strict
  });
}

// ../../node_modules/viem/_esm/actions/public/uninstallFilter.js
async function uninstallFilter(_client, { filter }) {
  return filter.request({
    method: "eth_uninstallFilter",
    params: [filter.id]
  });
}

// ../../node_modules/viem/_esm/actions/public/watchContractEvent.js
function watchContractEvent(client, parameters) {
  const { abi: abi2, address, args, batch = true, eventName, fromBlock, onError, onLogs, poll: poll_, pollingInterval = client.pollingInterval, strict: strict_ } = parameters;
  const enablePolling = (() => {
    if (typeof poll_ !== "undefined")
      return poll_;
    if (typeof fromBlock === "bigint")
      return true;
    if (client.transport.type === "webSocket")
      return false;
    if (client.transport.type === "fallback" && client.transport.transports[0].config.type === "webSocket")
      return false;
    return true;
  })();
  const pollContractEvent = () => {
    const strict = strict_ ?? false;
    const observerId = stringify([
      "watchContractEvent",
      address,
      args,
      batch,
      client.uid,
      eventName,
      pollingInterval,
      strict,
      fromBlock
    ]);
    return observe(observerId, { onLogs, onError }, (emit) => {
      let previousBlockNumber;
      if (fromBlock !== void 0)
        previousBlockNumber = fromBlock - 1n;
      let filter;
      let initialized = false;
      const unwatch = poll(async () => {
        if (!initialized) {
          try {
            filter = await getAction(client, createContractEventFilter, "createContractEventFilter")({
              abi: abi2,
              address,
              args,
              eventName,
              strict,
              fromBlock
            });
          } catch {
          }
          initialized = true;
          return;
        }
        try {
          let logs;
          if (filter) {
            logs = await getAction(client, getFilterChanges, "getFilterChanges")({ filter });
          } else {
            const blockNumber = await getAction(client, getBlockNumber, "getBlockNumber")({});
            if (previousBlockNumber && previousBlockNumber < blockNumber) {
              logs = await getAction(client, getContractEvents, "getContractEvents")({
                abi: abi2,
                address,
                args,
                eventName,
                fromBlock: previousBlockNumber + 1n,
                toBlock: blockNumber,
                strict
              });
            } else {
              logs = [];
            }
            previousBlockNumber = blockNumber;
          }
          if (logs.length === 0)
            return;
          if (batch)
            emit.onLogs(logs);
          else
            for (const log of logs)
              emit.onLogs([log]);
        } catch (err) {
          if (filter && err instanceof InvalidInputRpcError)
            initialized = false;
          emit.onError?.(err);
        }
      }, {
        emitOnBegin: true,
        interval: pollingInterval
      });
      return async () => {
        if (filter)
          await getAction(client, uninstallFilter, "uninstallFilter")({ filter });
        unwatch();
      };
    });
  };
  const subscribeContractEvent = () => {
    const strict = strict_ ?? false;
    const observerId = stringify([
      "watchContractEvent",
      address,
      args,
      batch,
      client.uid,
      eventName,
      pollingInterval,
      strict
    ]);
    let active = true;
    let unsubscribe = () => active = false;
    return observe(observerId, { onLogs, onError }, (emit) => {
      ;
      (async () => {
        try {
          const transport = (() => {
            if (client.transport.type === "fallback") {
              const transport2 = client.transport.transports.find((transport3) => transport3.config.type === "webSocket");
              if (!transport2)
                return client.transport;
              return transport2.value;
            }
            return client.transport;
          })();
          const topics = eventName ? encodeEventTopics({
            abi: abi2,
            eventName,
            args
          }) : [];
          const { unsubscribe: unsubscribe_ } = await transport.subscribe({
            params: ["logs", { address, topics }],
            onData(data) {
              if (!active)
                return;
              const log = data.result;
              try {
                const { eventName: eventName2, args: args2 } = decodeEventLog({
                  abi: abi2,
                  data: log.data,
                  topics: log.topics,
                  strict: strict_
                });
                const formatted = formatLog(log, {
                  args: args2,
                  eventName: eventName2
                });
                emit.onLogs([formatted]);
              } catch (err) {
                let eventName2;
                let isUnnamed;
                if (err instanceof DecodeLogDataMismatch || err instanceof DecodeLogTopicsMismatch) {
                  if (strict_)
                    return;
                  eventName2 = err.abiItem.name;
                  isUnnamed = err.abiItem.inputs?.some((x) => !("name" in x && x.name));
                }
                const formatted = formatLog(log, {
                  args: isUnnamed ? [] : {},
                  eventName: eventName2
                });
                emit.onLogs([formatted]);
              }
            },
            onError(error) {
              emit.onError?.(error);
            }
          });
          unsubscribe = unsubscribe_;
          if (!active)
            unsubscribe();
        } catch (err) {
          onError?.(err);
        }
      })();
      return () => unsubscribe();
    });
  };
  return enablePolling ? pollContractEvent() : subscribeContractEvent();
}

// ../../node_modules/viem/_esm/errors/account.js
var AccountNotFoundError = class extends BaseError {
  constructor({ docsPath: docsPath3 } = {}) {
    super([
      "Could not find an Account to execute with this Action.",
      "Please provide an Account with the `account` argument on the Action, or by supplying an `account` to the Client."
    ].join("\n"), {
      docsPath: docsPath3,
      docsSlug: "account",
      name: "AccountNotFoundError"
    });
  }
};
var AccountTypeNotSupportedError = class extends BaseError {
  constructor({ docsPath: docsPath3, metaMessages, type }) {
    super(`Account type "${type}" is not supported.`, {
      docsPath: docsPath3,
      metaMessages,
      name: "AccountTypeNotSupportedError"
    });
  }
};

// ../../node_modules/viem/_esm/utils/chain/assertCurrentChain.js
function assertCurrentChain({ chain, currentChainId }) {
  if (!chain)
    throw new ChainNotFoundError();
  if (currentChainId !== chain.id)
    throw new ChainMismatchError({ chain, currentChainId });
}

// ../../node_modules/viem/_esm/utils/errors/getTransactionError.js
function getTransactionError(err, { docsPath: docsPath3, ...args }) {
  const cause = (() => {
    const cause2 = getNodeError(err, args);
    if (cause2 instanceof UnknownNodeError)
      return err;
    return cause2;
  })();
  return new TransactionExecutionError(cause, {
    docsPath: docsPath3,
    ...args
  });
}

// ../../node_modules/viem/_esm/actions/wallet/sendRawTransaction.js
async function sendRawTransaction(client, { serializedTransaction }) {
  return client.request({
    method: "eth_sendRawTransaction",
    params: [serializedTransaction]
  }, { retryCount: 0 });
}

// ../../node_modules/viem/_esm/actions/wallet/sendTransaction.js
var supportsWalletNamespace = new LruMap(128);
async function sendTransaction(client, parameters) {
  const { account: account_ = client.account, chain = client.chain, accessList, authorizationList, blobs, data, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, nonce, value, ...rest } = parameters;
  if (typeof account_ === "undefined")
    throw new AccountNotFoundError({
      docsPath: "/docs/actions/wallet/sendTransaction"
    });
  const account = account_ ? parseAccount(account_) : null;
  try {
    assertRequest(parameters);
    const to = await (async () => {
      if (parameters.to)
        return parameters.to;
      if (authorizationList && authorizationList.length > 0)
        return await recoverAuthorizationAddress({
          authorization: authorizationList[0]
        }).catch(() => {
          throw new BaseError("`to` is required. Could not infer from `authorizationList`.");
        });
      return void 0;
    })();
    if (account?.type === "json-rpc" || account === null) {
      let chainId;
      if (chain !== null) {
        chainId = await getAction(client, getChainId, "getChainId")({});
        assertCurrentChain({
          currentChainId: chainId,
          chain
        });
      }
      const chainFormat = client.chain?.formatters?.transactionRequest?.format;
      const format = chainFormat || formatTransactionRequest;
      const request = format({
        // Pick out extra data that might exist on the chain's transaction request type.
        ...extract(rest, { format: chainFormat }),
        accessList,
        authorizationList,
        blobs,
        chainId,
        data,
        from: account?.address,
        gas,
        gasPrice,
        maxFeePerBlobGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        to,
        value
      });
      const isWalletNamespaceSupported = supportsWalletNamespace.get(client.uid);
      const method = isWalletNamespaceSupported ? "wallet_sendTransaction" : "eth_sendTransaction";
      try {
        return await client.request({
          method,
          params: [request]
        }, { retryCount: 0 });
      } catch (e) {
        if (isWalletNamespaceSupported === false)
          throw e;
        const error = e;
        if (error.name === "InvalidInputRpcError" || error.name === "InvalidParamsRpcError" || error.name === "MethodNotFoundRpcError" || error.name === "MethodNotSupportedRpcError") {
          return await client.request({
            method: "wallet_sendTransaction",
            params: [request]
          }, { retryCount: 0 }).then((hash) => {
            supportsWalletNamespace.set(client.uid, true);
            return hash;
          }).catch((e2) => {
            const walletNamespaceError = e2;
            if (walletNamespaceError.name === "MethodNotFoundRpcError" || walletNamespaceError.name === "MethodNotSupportedRpcError") {
              supportsWalletNamespace.set(client.uid, false);
              throw error;
            }
            throw walletNamespaceError;
          });
        }
        throw error;
      }
    }
    if (account?.type === "local") {
      const request = await getAction(client, prepareTransactionRequest, "prepareTransactionRequest")({
        account,
        accessList,
        authorizationList,
        blobs,
        chain,
        data,
        gas,
        gasPrice,
        maxFeePerBlobGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        nonceManager: account.nonceManager,
        parameters: [...defaultParameters, "sidecars"],
        value,
        ...rest,
        to
      });
      const serializer = chain?.serializers?.transaction;
      const serializedTransaction = await account.signTransaction(request, {
        serializer
      });
      return await getAction(client, sendRawTransaction, "sendRawTransaction")({
        serializedTransaction
      });
    }
    if (account?.type === "smart")
      throw new AccountTypeNotSupportedError({
        metaMessages: [
          "Consider using the `sendUserOperation` Action instead."
        ],
        docsPath: "/docs/actions/bundler/sendUserOperation",
        type: "smart"
      });
    throw new AccountTypeNotSupportedError({
      docsPath: "/docs/actions/wallet/sendTransaction",
      type: account?.type
    });
  } catch (err) {
    if (err instanceof AccountTypeNotSupportedError)
      throw err;
    throw getTransactionError(err, {
      ...parameters,
      account,
      chain: parameters.chain || void 0
    });
  }
}

// ../../node_modules/viem/_esm/actions/wallet/writeContract.js
async function writeContract(client, parameters) {
  const { abi: abi2, account: account_ = client.account, address, args, dataSuffix, functionName, ...request } = parameters;
  if (typeof account_ === "undefined")
    throw new AccountNotFoundError({
      docsPath: "/docs/contract/writeContract"
    });
  const account = account_ ? parseAccount(account_) : null;
  const data = encodeFunctionData({
    abi: abi2,
    args,
    functionName
  });
  try {
    return await getAction(client, sendTransaction, "sendTransaction")({
      data: `${data}${dataSuffix ? dataSuffix.replace("0x", "") : ""}`,
      to: address,
      account,
      ...request
    });
  } catch (error) {
    throw getContractError(error, {
      abi: abi2,
      address,
      args,
      docsPath: "/docs/contract/writeContract",
      functionName,
      sender: account?.address
    });
  }
}

// ../../node_modules/viem/_esm/errors/eip712.js
var Eip712DomainNotFoundError = class extends BaseError {
  constructor({ address }) {
    super(`No EIP-712 domain found on contract "${address}".`, {
      metaMessages: [
        "Ensure that:",
        `- The contract is deployed at the address "${address}".`,
        "- `eip712Domain()` function exists on the contract.",
        "- `eip712Domain()` function matches signature to ERC-5267 specification."
      ],
      name: "Eip712DomainNotFoundError"
    });
  }
};

// ../../node_modules/viem/_esm/actions/public/getEip712Domain.js
async function getEip712Domain(client, parameters) {
  const { address, factory, factoryData } = parameters;
  try {
    const [fields, name, version, chainId, verifyingContract, salt, extensions] = await getAction(client, readContract, "readContract")({
      abi,
      address,
      functionName: "eip712Domain",
      factory,
      factoryData
    });
    return {
      domain: {
        name,
        version,
        chainId: Number(chainId),
        verifyingContract,
        salt
      },
      extensions,
      fields
    };
  } catch (e) {
    const error = e;
    if (error.name === "ContractFunctionExecutionError" && error.cause.name === "ContractFunctionZeroDataError") {
      throw new Eip712DomainNotFoundError({ address });
    }
    throw error;
  }
}
var abi = [
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// ../../node_modules/viem/_esm/actions/wallet/addChain.js
async function addChain(client, { chain }) {
  const { id, name, nativeCurrency, rpcUrls, blockExplorers } = chain;
  await client.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: numberToHex(id),
        chainName: name,
        nativeCurrency,
        rpcUrls: rpcUrls.default.http,
        blockExplorerUrls: blockExplorers ? Object.values(blockExplorers).map(({ url }) => url) : void 0
      }
    ]
  }, { dedupe: true, retryCount: 0 });
}

// ../../node_modules/viem/_esm/utils/uid.js
var size2 = 256;
var index = size2;
var buffer;
function uid(length = 11) {
  if (!buffer || index + length > size2 * 2) {
    buffer = "";
    index = 0;
    for (let i = 0; i < size2; i++) {
      buffer += (256 + Math.random() * 256 | 0).toString(16).substring(1);
    }
  }
  return buffer.substring(index, index++ + length);
}

// ../../node_modules/viem/_esm/clients/createClient.js
function createClient(parameters) {
  const { batch, cacheTime = parameters.pollingInterval ?? 4e3, ccipRead, key = "base", name = "Base Client", pollingInterval = 4e3, type = "base" } = parameters;
  const chain = parameters.chain;
  const account = parameters.account ? parseAccount(parameters.account) : void 0;
  const { config, request, value } = parameters.transport({
    chain,
    pollingInterval
  });
  const transport = { ...config, ...value };
  const client = {
    account,
    batch,
    cacheTime,
    ccipRead,
    chain,
    key,
    name,
    pollingInterval,
    request,
    transport,
    type,
    uid: uid()
  };
  function extend(base) {
    return (extendFn) => {
      const extended = extendFn(base);
      for (const key2 in client)
        delete extended[key2];
      const combined = { ...base, ...extended };
      return Object.assign(combined, { extend: extend(combined) });
    };
  }
  return Object.assign(client, { extend: extend(client) });
}

// ../../node_modules/viem/_esm/utils/promise/withDedupe.js
var promiseCache2 = /* @__PURE__ */ new LruMap(8192);
function withDedupe(fn, { enabled = true, id }) {
  if (!enabled || !id)
    return fn();
  if (promiseCache2.get(id))
    return promiseCache2.get(id);
  const promise = fn().finally(() => promiseCache2.delete(id));
  promiseCache2.set(id, promise);
  return promise;
}

// ../../node_modules/viem/_esm/utils/promise/withRetry.js
function withRetry(fn, { delay: delay_ = 100, retryCount = 2, shouldRetry: shouldRetry2 = () => true } = {}) {
  return new Promise((resolve, reject) => {
    const attemptRetry = async ({ count = 0 } = {}) => {
      const retry = async ({ error }) => {
        const delay = typeof delay_ === "function" ? delay_({ count, error }) : delay_;
        if (delay)
          await wait(delay);
        attemptRetry({ count: count + 1 });
      };
      try {
        const data = await fn();
        resolve(data);
      } catch (err) {
        if (count < retryCount && await shouldRetry2({ count, error: err }))
          return retry({ error: err });
        reject(err);
      }
    };
    attemptRetry();
  });
}

// ../../node_modules/viem/_esm/utils/buildRequest.js
function buildRequest(request, options = {}) {
  return async (args, overrideOptions = {}) => {
    const { dedupe = false, retryDelay = 150, retryCount = 3, uid: uid2 } = {
      ...options,
      ...overrideOptions
    };
    const requestId = dedupe ? keccak256(stringToHex(`${uid2}.${stringify(args)}`)) : void 0;
    return withDedupe(() => withRetry(async () => {
      try {
        return await request(args);
      } catch (err_) {
        const err = err_;
        switch (err.code) {
          // -32700
          case ParseRpcError.code:
            throw new ParseRpcError(err);
          // -32600
          case InvalidRequestRpcError.code:
            throw new InvalidRequestRpcError(err);
          // -32601
          case MethodNotFoundRpcError.code:
            throw new MethodNotFoundRpcError(err, { method: args.method });
          // -32602
          case InvalidParamsRpcError.code:
            throw new InvalidParamsRpcError(err);
          // -32603
          case InternalRpcError.code:
            throw new InternalRpcError(err);
          // -32000
          case InvalidInputRpcError.code:
            throw new InvalidInputRpcError(err);
          // -32001
          case ResourceNotFoundRpcError.code:
            throw new ResourceNotFoundRpcError(err);
          // -32002
          case ResourceUnavailableRpcError.code:
            throw new ResourceUnavailableRpcError(err);
          // -32003
          case TransactionRejectedRpcError.code:
            throw new TransactionRejectedRpcError(err);
          // -32004
          case MethodNotSupportedRpcError.code:
            throw new MethodNotSupportedRpcError(err, {
              method: args.method
            });
          // -32005
          case LimitExceededRpcError.code:
            throw new LimitExceededRpcError(err);
          // -32006
          case JsonRpcVersionUnsupportedError.code:
            throw new JsonRpcVersionUnsupportedError(err);
          // 4001
          case UserRejectedRequestError.code:
            throw new UserRejectedRequestError(err);
          // 4100
          case UnauthorizedProviderError.code:
            throw new UnauthorizedProviderError(err);
          // 4200
          case UnsupportedProviderMethodError.code:
            throw new UnsupportedProviderMethodError(err);
          // 4900
          case ProviderDisconnectedError.code:
            throw new ProviderDisconnectedError(err);
          // 4901
          case ChainDisconnectedError.code:
            throw new ChainDisconnectedError(err);
          // 4902
          case SwitchChainError.code:
            throw new SwitchChainError(err);
          // CAIP-25: User Rejected Error
          // https://docs.walletconnect.com/2.0/specs/clients/sign/error-codes#rejected-caip-25
          case 5e3:
            throw new UserRejectedRequestError(err);
          default:
            if (err_ instanceof BaseError)
              throw err_;
            throw new UnknownRpcError(err);
        }
      }
    }, {
      delay: ({ count, error }) => {
        if (error && error instanceof HttpRequestError) {
          const retryAfter = error?.headers?.get("Retry-After");
          if (retryAfter?.match(/\d/))
            return Number.parseInt(retryAfter) * 1e3;
        }
        return ~~(1 << count) * retryDelay;
      },
      retryCount,
      shouldRetry: ({ error }) => shouldRetry(error)
    }), { enabled: dedupe, id: requestId });
  };
}
function shouldRetry(error) {
  if ("code" in error && typeof error.code === "number") {
    if (error.code === -1)
      return true;
    if (error.code === LimitExceededRpcError.code)
      return true;
    if (error.code === InternalRpcError.code)
      return true;
    return false;
  }
  if (error instanceof HttpRequestError && error.status) {
    if (error.status === 403)
      return true;
    if (error.status === 408)
      return true;
    if (error.status === 413)
      return true;
    if (error.status === 429)
      return true;
    if (error.status === 500)
      return true;
    if (error.status === 502)
      return true;
    if (error.status === 503)
      return true;
    if (error.status === 504)
      return true;
    return false;
  }
  return true;
}

// ../../node_modules/viem/_esm/clients/transports/createTransport.js
function createTransport({ key, name, request, retryCount = 3, retryDelay = 150, timeout, type }, value) {
  const uid2 = uid();
  return {
    config: {
      key,
      name,
      request,
      retryCount,
      retryDelay,
      timeout,
      type
    },
    request: buildRequest(request, { retryCount, retryDelay, uid: uid2 }),
    value
  };
}

// ../../node_modules/viem/_esm/errors/transport.js
var UrlRequiredError = class extends BaseError {
  constructor() {
    super("No URL was provided to the Transport. Please provide a valid RPC URL to the Transport.", {
      docsPath: "/docs/clients/intro",
      name: "UrlRequiredError"
    });
  }
};

// ../../node_modules/viem/_esm/utils/promise/withTimeout.js
function withTimeout(fn, { errorInstance = new Error("timed out"), timeout, signal }) {
  return new Promise((resolve, reject) => {
    ;
    (async () => {
      let timeoutId;
      try {
        const controller = new AbortController();
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            if (signal) {
              controller.abort();
            } else {
              reject(errorInstance);
            }
          }, timeout);
        }
        resolve(await fn({ signal: controller?.signal || null }));
      } catch (err) {
        if (err?.name === "AbortError")
          reject(errorInstance);
        reject(err);
      } finally {
        clearTimeout(timeoutId);
      }
    })();
  });
}

// ../../node_modules/viem/_esm/utils/rpc/id.js
function createIdStore() {
  return {
    current: 0,
    take() {
      return this.current++;
    },
    reset() {
      this.current = 0;
    }
  };
}
var idCache = /* @__PURE__ */ createIdStore();

// ../../node_modules/viem/_esm/utils/rpc/http.js
function getHttpRpcClient(url, options = {}) {
  return {
    async request(params) {
      const { body, onRequest = options.onRequest, onResponse = options.onResponse, timeout = options.timeout ?? 1e4 } = params;
      const fetchOptions = {
        ...options.fetchOptions ?? {},
        ...params.fetchOptions ?? {}
      };
      const { headers, method, signal: signal_ } = fetchOptions;
      try {
        const response = await withTimeout(async ({ signal }) => {
          const init = {
            ...fetchOptions,
            body: Array.isArray(body) ? stringify(body.map((body2) => ({
              jsonrpc: "2.0",
              id: body2.id ?? idCache.take(),
              ...body2
            }))) : stringify({
              jsonrpc: "2.0",
              id: body.id ?? idCache.take(),
              ...body
            }),
            headers: {
              "Content-Type": "application/json",
              ...headers
            },
            method: method || "POST",
            signal: signal_ || (timeout > 0 ? signal : null)
          };
          const request = new Request(url, init);
          const args = await onRequest?.(request, init) ?? { ...init, url };
          const response2 = await fetch(args.url ?? url, args);
          return response2;
        }, {
          errorInstance: new TimeoutError({ body, url }),
          timeout,
          signal: true
        });
        if (onResponse)
          await onResponse(response);
        let data;
        if (response.headers.get("Content-Type")?.startsWith("application/json"))
          data = await response.json();
        else {
          data = await response.text();
          try {
            data = JSON.parse(data || "{}");
          } catch (err) {
            if (response.ok)
              throw err;
            data = { error: data };
          }
        }
        if (!response.ok) {
          throw new HttpRequestError({
            body,
            details: stringify(data.error) || response.statusText,
            headers: response.headers,
            status: response.status,
            url
          });
        }
        return data;
      } catch (err) {
        if (err instanceof HttpRequestError)
          throw err;
        if (err instanceof TimeoutError)
          throw err;
        throw new HttpRequestError({
          body,
          cause: err,
          url
        });
      }
    }
  };
}

// ../../node_modules/viem/_esm/clients/transports/http.js
function http(url, config = {}) {
  const { batch, fetchOptions, key = "http", name = "HTTP JSON-RPC", onFetchRequest, onFetchResponse, retryDelay } = config;
  return ({ chain, retryCount: retryCount_, timeout: timeout_ }) => {
    const { batchSize = 1e3, wait: wait2 = 0 } = typeof batch === "object" ? batch : {};
    const retryCount = config.retryCount ?? retryCount_;
    const timeout = timeout_ ?? config.timeout ?? 1e4;
    const url_ = url || chain?.rpcUrls.default.http[0];
    if (!url_)
      throw new UrlRequiredError();
    const rpcClient = getHttpRpcClient(url_, {
      fetchOptions,
      onRequest: onFetchRequest,
      onResponse: onFetchResponse,
      timeout
    });
    return createTransport({
      key,
      name,
      async request({ method, params }) {
        const body = { method, params };
        const { schedule } = createBatchScheduler({
          id: url_,
          wait: wait2,
          shouldSplitBatch(requests) {
            return requests.length > batchSize;
          },
          fn: (body2) => rpcClient.request({
            body: body2
          }),
          sort: (a, b) => a.id - b.id
        });
        const fn = async (body2) => batch ? schedule(body2) : [
          await rpcClient.request({
            body: body2
          })
        ];
        const [{ error, result }] = await fn(body);
        if (error)
          throw new RpcRequestError({
            body,
            error,
            url: url_
          });
        return result;
      },
      retryCount,
      retryDelay,
      timeout,
      type: "http"
    }, {
      fetchOptions,
      url: url_
    });
  };
}

// ../../node_modules/viem/_esm/utils/ens/errors.js
function isNullUniversalResolverError(err, callType) {
  if (!(err instanceof BaseError))
    return false;
  const cause = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (!(cause instanceof ContractFunctionRevertedError))
    return false;
  if (cause.data?.errorName === "ResolverNotFound")
    return true;
  if (cause.data?.errorName === "ResolverWildcardNotSupported")
    return true;
  if (cause.data?.errorName === "ResolverNotContract")
    return true;
  if (cause.data?.errorName === "ResolverError")
    return true;
  if (cause.data?.errorName === "HttpError")
    return true;
  if (cause.reason?.includes("Wildcard on non-extended resolvers is not supported"))
    return true;
  if (callType === "reverse" && cause.reason === panicReasons[50])
    return true;
  return false;
}

// ../../node_modules/viem/_esm/utils/ens/encodedLabelToLabelhash.js
function encodedLabelToLabelhash(label) {
  if (label.length !== 66)
    return null;
  if (label.indexOf("[") !== 0)
    return null;
  if (label.indexOf("]") !== 65)
    return null;
  const hash = `0x${label.slice(1, 65)}`;
  if (!isHex(hash))
    return null;
  return hash;
}

// ../../node_modules/viem/_esm/utils/ens/namehash.js
function namehash(name) {
  let result = new Uint8Array(32).fill(0);
  if (!name)
    return bytesToHex(result);
  const labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i -= 1) {
    const hashFromEncodedLabel = encodedLabelToLabelhash(labels[i]);
    const hashed = hashFromEncodedLabel ? toBytes(hashFromEncodedLabel) : keccak256(stringToBytes(labels[i]), "bytes");
    result = keccak256(concat([result, hashed]), "bytes");
  }
  return bytesToHex(result);
}

// ../../node_modules/viem/_esm/utils/ens/encodeLabelhash.js
function encodeLabelhash(hash) {
  return `[${hash.slice(2)}]`;
}

// ../../node_modules/viem/_esm/utils/ens/labelhash.js
function labelhash(label) {
  const result = new Uint8Array(32).fill(0);
  if (!label)
    return bytesToHex(result);
  return encodedLabelToLabelhash(label) || keccak256(stringToBytes(label));
}

// ../../node_modules/viem/_esm/utils/ens/packetToBytes.js
function packetToBytes(packet) {
  const value = packet.replace(/^\.|\.$/gm, "");
  if (value.length === 0)
    return new Uint8Array(1);
  const bytes = new Uint8Array(stringToBytes(value).byteLength + 2);
  let offset = 0;
  const list = value.split(".");
  for (let i = 0; i < list.length; i++) {
    let encoded = stringToBytes(list[i]);
    if (encoded.byteLength > 255)
      encoded = stringToBytes(encodeLabelhash(labelhash(list[i])));
    bytes[offset] = encoded.length;
    bytes.set(encoded, offset + 1);
    offset += encoded.length + 1;
  }
  if (bytes.byteLength !== offset + 1)
    return bytes.slice(0, offset + 1);
  return bytes;
}

// ../../node_modules/viem/_esm/actions/ens/getEnsAddress.js
async function getEnsAddress(client, { blockNumber, blockTag, coinType, name, gatewayUrls, strict, universalResolverAddress: universalResolverAddress_ }) {
  let universalResolverAddress = universalResolverAddress_;
  if (!universalResolverAddress) {
    if (!client.chain)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    universalResolverAddress = getChainContractAddress({
      blockNumber,
      chain: client.chain,
      contract: "ensUniversalResolver"
    });
  }
  try {
    const functionData = encodeFunctionData({
      abi: addressResolverAbi,
      functionName: "addr",
      ...coinType != null ? { args: [namehash(name), BigInt(coinType)] } : { args: [namehash(name)] }
    });
    const readContractParameters = {
      address: universalResolverAddress,
      abi: universalResolverResolveAbi,
      functionName: "resolve",
      args: [toHex(packetToBytes(name)), functionData],
      blockNumber,
      blockTag
    };
    const readContractAction = getAction(client, readContract, "readContract");
    const res = gatewayUrls ? await readContractAction({
      ...readContractParameters,
      args: [...readContractParameters.args, gatewayUrls]
    }) : await readContractAction(readContractParameters);
    if (res[0] === "0x")
      return null;
    const address = decodeFunctionResult({
      abi: addressResolverAbi,
      args: coinType != null ? [namehash(name), BigInt(coinType)] : void 0,
      functionName: "addr",
      data: res[0]
    });
    if (address === "0x")
      return null;
    if (trim(address) === "0x00")
      return null;
    return address;
  } catch (err) {
    if (strict)
      throw err;
    if (isNullUniversalResolverError(err, "resolve"))
      return null;
    throw err;
  }
}

// ../../node_modules/viem/_esm/errors/ens.js
var EnsAvatarInvalidMetadataError = class extends BaseError {
  constructor({ data }) {
    super("Unable to extract image from metadata. The metadata may be malformed or invalid.", {
      metaMessages: [
        "- Metadata must be a JSON object with at least an `image`, `image_url` or `image_data` property.",
        "",
        `Provided data: ${JSON.stringify(data)}`
      ],
      name: "EnsAvatarInvalidMetadataError"
    });
  }
};
var EnsAvatarInvalidNftUriError = class extends BaseError {
  constructor({ reason }) {
    super(`ENS NFT avatar URI is invalid. ${reason}`, {
      name: "EnsAvatarInvalidNftUriError"
    });
  }
};
var EnsAvatarUriResolutionError = class extends BaseError {
  constructor({ uri }) {
    super(`Unable to resolve ENS avatar URI "${uri}". The URI may be malformed, invalid, or does not respond with a valid image.`, { name: "EnsAvatarUriResolutionError" });
  }
};
var EnsAvatarUnsupportedNamespaceError = class extends BaseError {
  constructor({ namespace }) {
    super(`ENS NFT avatar namespace "${namespace}" is not supported. Must be "erc721" or "erc1155".`, { name: "EnsAvatarUnsupportedNamespaceError" });
  }
};

// ../../node_modules/viem/_esm/utils/ens/avatar/utils.js
var networkRegex = /(?<protocol>https?:\/\/[^\/]*|ipfs:\/|ipns:\/|ar:\/)?(?<root>\/)?(?<subpath>ipfs\/|ipns\/)?(?<target>[\w\-.]+)(?<subtarget>\/.*)?/;
var ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})(\/(?<target>[\w\-.]+))?(?<subtarget>\/.*)?$/;
var base64Regex = /^data:([a-zA-Z\-/+]*);base64,([^"].*)/;
var dataURIRegex = /^data:([a-zA-Z\-/+]*)?(;[a-zA-Z0-9].*?)?(,)/;
async function isImageUri(uri) {
  try {
    const res = await fetch(uri, { method: "HEAD" });
    if (res.status === 200) {
      const contentType = res.headers.get("content-type");
      return contentType?.startsWith("image/");
    }
    return false;
  } catch (error) {
    if (typeof error === "object" && typeof error.response !== "undefined") {
      return false;
    }
    if (!globalThis.hasOwnProperty("Image"))
      return false;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = uri;
    });
  }
}
function getGateway(custom, defaultGateway) {
  if (!custom)
    return defaultGateway;
  if (custom.endsWith("/"))
    return custom.slice(0, -1);
  return custom;
}
function resolveAvatarUri({ uri, gatewayUrls }) {
  const isEncoded = base64Regex.test(uri);
  if (isEncoded)
    return { uri, isOnChain: true, isEncoded };
  const ipfsGateway = getGateway(gatewayUrls?.ipfs, "https://ipfs.io");
  const arweaveGateway = getGateway(gatewayUrls?.arweave, "https://arweave.net");
  const networkRegexMatch = uri.match(networkRegex);
  const { protocol, subpath, target, subtarget = "" } = networkRegexMatch?.groups || {};
  const isIPNS = protocol === "ipns:/" || subpath === "ipns/";
  const isIPFS = protocol === "ipfs:/" || subpath === "ipfs/" || ipfsHashRegex.test(uri);
  if (uri.startsWith("http") && !isIPNS && !isIPFS) {
    let replacedUri = uri;
    if (gatewayUrls?.arweave)
      replacedUri = uri.replace(/https:\/\/arweave.net/g, gatewayUrls?.arweave);
    return { uri: replacedUri, isOnChain: false, isEncoded: false };
  }
  if ((isIPNS || isIPFS) && target) {
    return {
      uri: `${ipfsGateway}/${isIPNS ? "ipns" : "ipfs"}/${target}${subtarget}`,
      isOnChain: false,
      isEncoded: false
    };
  }
  if (protocol === "ar:/" && target) {
    return {
      uri: `${arweaveGateway}/${target}${subtarget || ""}`,
      isOnChain: false,
      isEncoded: false
    };
  }
  let parsedUri = uri.replace(dataURIRegex, "");
  if (parsedUri.startsWith("<svg")) {
    parsedUri = `data:image/svg+xml;base64,${btoa(parsedUri)}`;
  }
  if (parsedUri.startsWith("data:") || parsedUri.startsWith("{")) {
    return {
      uri: parsedUri,
      isOnChain: true,
      isEncoded: false
    };
  }
  throw new EnsAvatarUriResolutionError({ uri });
}
function getJsonImage(data) {
  if (typeof data !== "object" || !("image" in data) && !("image_url" in data) && !("image_data" in data)) {
    throw new EnsAvatarInvalidMetadataError({ data });
  }
  return data.image || data.image_url || data.image_data;
}
async function getMetadataAvatarUri({ gatewayUrls, uri }) {
  try {
    const res = await fetch(uri).then((res2) => res2.json());
    const image = await parseAvatarUri({
      gatewayUrls,
      uri: getJsonImage(res)
    });
    return image;
  } catch {
    throw new EnsAvatarUriResolutionError({ uri });
  }
}
async function parseAvatarUri({ gatewayUrls, uri }) {
  const { uri: resolvedURI, isOnChain } = resolveAvatarUri({ uri, gatewayUrls });
  if (isOnChain)
    return resolvedURI;
  const isImage = await isImageUri(resolvedURI);
  if (isImage)
    return resolvedURI;
  throw new EnsAvatarUriResolutionError({ uri });
}
function parseNftUri(uri_) {
  let uri = uri_;
  if (uri.startsWith("did:nft:")) {
    uri = uri.replace("did:nft:", "").replace(/_/g, "/");
  }
  const [reference, asset_namespace, tokenID] = uri.split("/");
  const [eip_namespace, chainID] = reference.split(":");
  const [erc_namespace, contractAddress] = asset_namespace.split(":");
  if (!eip_namespace || eip_namespace.toLowerCase() !== "eip155")
    throw new EnsAvatarInvalidNftUriError({ reason: "Only EIP-155 supported" });
  if (!chainID)
    throw new EnsAvatarInvalidNftUriError({ reason: "Chain ID not found" });
  if (!contractAddress)
    throw new EnsAvatarInvalidNftUriError({
      reason: "Contract address not found"
    });
  if (!tokenID)
    throw new EnsAvatarInvalidNftUriError({ reason: "Token ID not found" });
  if (!erc_namespace)
    throw new EnsAvatarInvalidNftUriError({ reason: "ERC namespace not found" });
  return {
    chainID: Number.parseInt(chainID),
    namespace: erc_namespace.toLowerCase(),
    contractAddress,
    tokenID
  };
}
async function getNftTokenUri(client, { nft }) {
  if (nft.namespace === "erc721") {
    return readContract(client, {
      address: nft.contractAddress,
      abi: [
        {
          name: "tokenURI",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "tokenId", type: "uint256" }],
          outputs: [{ name: "", type: "string" }]
        }
      ],
      functionName: "tokenURI",
      args: [BigInt(nft.tokenID)]
    });
  }
  if (nft.namespace === "erc1155") {
    return readContract(client, {
      address: nft.contractAddress,
      abi: [
        {
          name: "uri",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "_id", type: "uint256" }],
          outputs: [{ name: "", type: "string" }]
        }
      ],
      functionName: "uri",
      args: [BigInt(nft.tokenID)]
    });
  }
  throw new EnsAvatarUnsupportedNamespaceError({ namespace: nft.namespace });
}

// ../../node_modules/viem/_esm/utils/ens/avatar/parseAvatarRecord.js
async function parseAvatarRecord(client, { gatewayUrls, record }) {
  if (/eip155:/i.test(record))
    return parseNftAvatarUri(client, { gatewayUrls, record });
  return parseAvatarUri({ uri: record, gatewayUrls });
}
async function parseNftAvatarUri(client, { gatewayUrls, record }) {
  const nft = parseNftUri(record);
  const nftUri = await getNftTokenUri(client, { nft });
  const { uri: resolvedNftUri, isOnChain, isEncoded } = resolveAvatarUri({ uri: nftUri, gatewayUrls });
  if (isOnChain && (resolvedNftUri.includes("data:application/json;base64,") || resolvedNftUri.startsWith("{"))) {
    const encodedJson = isEncoded ? (
      // if it is encoded, decode it
      atob(resolvedNftUri.replace("data:application/json;base64,", ""))
    ) : (
      // if it isn't encoded assume it is a JSON string, but it could be anything (it will error if it is)
      resolvedNftUri
    );
    const decoded = JSON.parse(encodedJson);
    return parseAvatarUri({ uri: getJsonImage(decoded), gatewayUrls });
  }
  let uriTokenId = nft.tokenID;
  if (nft.namespace === "erc1155")
    uriTokenId = uriTokenId.replace("0x", "").padStart(64, "0");
  return getMetadataAvatarUri({
    gatewayUrls,
    uri: resolvedNftUri.replace(/(?:0x)?{id}/, uriTokenId)
  });
}

// ../../node_modules/viem/_esm/actions/ens/getEnsText.js
async function getEnsText(client, { blockNumber, blockTag, name, key, gatewayUrls, strict, universalResolverAddress: universalResolverAddress_ }) {
  let universalResolverAddress = universalResolverAddress_;
  if (!universalResolverAddress) {
    if (!client.chain)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    universalResolverAddress = getChainContractAddress({
      blockNumber,
      chain: client.chain,
      contract: "ensUniversalResolver"
    });
  }
  try {
    const readContractParameters = {
      address: universalResolverAddress,
      abi: universalResolverResolveAbi,
      functionName: "resolve",
      args: [
        toHex(packetToBytes(name)),
        encodeFunctionData({
          abi: textResolverAbi,
          functionName: "text",
          args: [namehash(name), key]
        })
      ],
      blockNumber,
      blockTag
    };
    const readContractAction = getAction(client, readContract, "readContract");
    const res = gatewayUrls ? await readContractAction({
      ...readContractParameters,
      args: [...readContractParameters.args, gatewayUrls]
    }) : await readContractAction(readContractParameters);
    if (res[0] === "0x")
      return null;
    const record = decodeFunctionResult({
      abi: textResolverAbi,
      functionName: "text",
      data: res[0]
    });
    return record === "" ? null : record;
  } catch (err) {
    if (strict)
      throw err;
    if (isNullUniversalResolverError(err, "resolve"))
      return null;
    throw err;
  }
}

// ../../node_modules/viem/_esm/actions/ens/getEnsAvatar.js
async function getEnsAvatar(client, { blockNumber, blockTag, assetGatewayUrls, name, gatewayUrls, strict, universalResolverAddress }) {
  const record = await getAction(client, getEnsText, "getEnsText")({
    blockNumber,
    blockTag,
    key: "avatar",
    name,
    universalResolverAddress,
    gatewayUrls,
    strict
  });
  if (!record)
    return null;
  try {
    return await parseAvatarRecord(client, {
      record,
      gatewayUrls: assetGatewayUrls
    });
  } catch {
    return null;
  }
}

// ../../node_modules/viem/_esm/actions/ens/getEnsName.js
async function getEnsName(client, { address, blockNumber, blockTag, gatewayUrls, strict, universalResolverAddress: universalResolverAddress_ }) {
  let universalResolverAddress = universalResolverAddress_;
  if (!universalResolverAddress) {
    if (!client.chain)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    universalResolverAddress = getChainContractAddress({
      blockNumber,
      chain: client.chain,
      contract: "ensUniversalResolver"
    });
  }
  const reverseNode = `${address.toLowerCase().substring(2)}.addr.reverse`;
  try {
    const readContractParameters = {
      address: universalResolverAddress,
      abi: universalResolverReverseAbi,
      functionName: "reverse",
      args: [toHex(packetToBytes(reverseNode))],
      blockNumber,
      blockTag
    };
    const readContractAction = getAction(client, readContract, "readContract");
    const [name, resolvedAddress] = gatewayUrls ? await readContractAction({
      ...readContractParameters,
      args: [...readContractParameters.args, gatewayUrls]
    }) : await readContractAction(readContractParameters);
    if (address.toLowerCase() !== resolvedAddress.toLowerCase())
      return null;
    return name;
  } catch (err) {
    if (strict)
      throw err;
    if (isNullUniversalResolverError(err, "reverse"))
      return null;
    throw err;
  }
}

// ../../node_modules/viem/_esm/actions/ens/getEnsResolver.js
async function getEnsResolver(client, { blockNumber, blockTag, name, universalResolverAddress: universalResolverAddress_ }) {
  let universalResolverAddress = universalResolverAddress_;
  if (!universalResolverAddress) {
    if (!client.chain)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    universalResolverAddress = getChainContractAddress({
      blockNumber,
      chain: client.chain,
      contract: "ensUniversalResolver"
    });
  }
  const [resolverAddress] = await getAction(client, readContract, "readContract")({
    address: universalResolverAddress,
    abi: [
      {
        inputs: [{ type: "bytes" }],
        name: "findResolver",
        outputs: [{ type: "address" }, { type: "bytes32" }],
        stateMutability: "view",
        type: "function"
      }
    ],
    functionName: "findResolver",
    args: [toHex(packetToBytes(name))],
    blockNumber,
    blockTag
  });
  return resolverAddress;
}

// ../../node_modules/viem/_esm/actions/public/createBlockFilter.js
async function createBlockFilter(client) {
  const getRequest = createFilterRequestScope(client, {
    method: "eth_newBlockFilter"
  });
  const id = await client.request({
    method: "eth_newBlockFilter"
  });
  return { id, request: getRequest(id), type: "block" };
}

// ../../node_modules/viem/_esm/actions/public/createEventFilter.js
async function createEventFilter(client, { address, args, event, events: events_, fromBlock, strict, toBlock } = {}) {
  const events = events_ ?? (event ? [event] : void 0);
  const getRequest = createFilterRequestScope(client, {
    method: "eth_newFilter"
  });
  let topics = [];
  if (events) {
    const encoded = events.flatMap((event2) => encodeEventTopics({
      abi: [event2],
      eventName: event2.name,
      args
    }));
    topics = [encoded];
    if (event)
      topics = topics[0];
  }
  const id = await client.request({
    method: "eth_newFilter",
    params: [
      {
        address,
        fromBlock: typeof fromBlock === "bigint" ? numberToHex(fromBlock) : fromBlock,
        toBlock: typeof toBlock === "bigint" ? numberToHex(toBlock) : toBlock,
        ...topics.length ? { topics } : {}
      }
    ]
  });
  return {
    abi: events,
    args,
    eventName: event ? event.name : void 0,
    fromBlock,
    id,
    request: getRequest(id),
    strict: Boolean(strict),
    toBlock,
    type: "event"
  };
}

// ../../node_modules/viem/_esm/actions/public/createPendingTransactionFilter.js
async function createPendingTransactionFilter(client) {
  const getRequest = createFilterRequestScope(client, {
    method: "eth_newPendingTransactionFilter"
  });
  const id = await client.request({
    method: "eth_newPendingTransactionFilter"
  });
  return { id, request: getRequest(id), type: "transaction" };
}

// ../../node_modules/viem/_esm/actions/public/getBlobBaseFee.js
async function getBlobBaseFee(client) {
  const baseFee = await client.request({
    method: "eth_blobBaseFee"
  });
  return BigInt(baseFee);
}

// ../../node_modules/viem/_esm/actions/public/getBlockTransactionCount.js
async function getBlockTransactionCount(client, { blockHash, blockNumber, blockTag = "latest" } = {}) {
  const blockNumberHex = blockNumber !== void 0 ? numberToHex(blockNumber) : void 0;
  let count;
  if (blockHash) {
    count = await client.request({
      method: "eth_getBlockTransactionCountByHash",
      params: [blockHash]
    }, { dedupe: true });
  } else {
    count = await client.request({
      method: "eth_getBlockTransactionCountByNumber",
      params: [blockNumberHex || blockTag]
    }, { dedupe: Boolean(blockNumberHex) });
  }
  return hexToNumber(count);
}

// ../../node_modules/viem/_esm/actions/public/getCode.js
async function getCode(client, { address, blockNumber, blockTag = "latest" }) {
  const blockNumberHex = blockNumber !== void 0 ? numberToHex(blockNumber) : void 0;
  const hex = await client.request({
    method: "eth_getCode",
    params: [address, blockNumberHex || blockTag]
  }, { dedupe: Boolean(blockNumberHex) });
  if (hex === "0x")
    return void 0;
  return hex;
}

// ../../node_modules/viem/_esm/utils/formatters/feeHistory.js
function formatFeeHistory(feeHistory) {
  return {
    baseFeePerGas: feeHistory.baseFeePerGas.map((value) => BigInt(value)),
    gasUsedRatio: feeHistory.gasUsedRatio,
    oldestBlock: BigInt(feeHistory.oldestBlock),
    reward: feeHistory.reward?.map((reward) => reward.map((value) => BigInt(value)))
  };
}

// ../../node_modules/viem/_esm/actions/public/getFeeHistory.js
async function getFeeHistory(client, { blockCount, blockNumber, blockTag = "latest", rewardPercentiles }) {
  const blockNumberHex = blockNumber ? numberToHex(blockNumber) : void 0;
  const feeHistory = await client.request({
    method: "eth_feeHistory",
    params: [
      numberToHex(blockCount),
      blockNumberHex || blockTag,
      rewardPercentiles
    ]
  }, { dedupe: Boolean(blockNumberHex) });
  return formatFeeHistory(feeHistory);
}

// ../../node_modules/viem/_esm/actions/public/getFilterLogs.js
async function getFilterLogs(_client, { filter }) {
  const strict = filter.strict ?? false;
  const logs = await filter.request({
    method: "eth_getFilterLogs",
    params: [filter.id]
  });
  const formattedLogs = logs.map((log) => formatLog(log));
  if (!filter.abi)
    return formattedLogs;
  return parseEventLogs({
    abi: filter.abi,
    logs: formattedLogs,
    strict
  });
}

// ../../node_modules/viem/_esm/utils/chain/defineChain.js
function defineChain(chain) {
  return {
    formatters: void 0,
    fees: void 0,
    serializers: void 0,
    ...chain
  };
}

// ../../node_modules/viem/_esm/errors/typedData.js
var InvalidDomainError = class extends BaseError {
  constructor({ domain }) {
    super(`Invalid domain "${stringify(domain)}".`, {
      metaMessages: ["Must be a valid EIP-712 domain."]
    });
  }
};
var InvalidPrimaryTypeError = class extends BaseError {
  constructor({ primaryType, types }) {
    super(`Invalid primary type \`${primaryType}\` must be one of \`${JSON.stringify(Object.keys(types))}\`.`, {
      docsPath: "/api/glossary/Errors#typeddatainvalidprimarytypeerror",
      metaMessages: ["Check that the primary type is a key in `types`."]
    });
  }
};
var InvalidStructTypeError = class extends BaseError {
  constructor({ type }) {
    super(`Struct type "${type}" is invalid.`, {
      metaMessages: ["Struct type must not be a Solidity type."],
      name: "InvalidStructTypeError"
    });
  }
};

// ../../node_modules/viem/_esm/utils/signature/hashTypedData.js
function hashTypedData(parameters) {
  const { domain = {}, message, primaryType } = parameters;
  const types = {
    EIP712Domain: getTypesForEIP712Domain({ domain }),
    ...parameters.types
  };
  validateTypedData({
    domain,
    message,
    primaryType,
    types
  });
  const parts = ["0x1901"];
  if (domain)
    parts.push(hashDomain({
      domain,
      types
    }));
  if (primaryType !== "EIP712Domain")
    parts.push(hashStruct({
      data: message,
      primaryType,
      types
    }));
  return keccak256(concat(parts));
}
function hashDomain({ domain, types }) {
  return hashStruct({
    data: domain,
    primaryType: "EIP712Domain",
    types
  });
}
function hashStruct({ data, primaryType, types }) {
  const encoded = encodeData({
    data,
    primaryType,
    types
  });
  return keccak256(encoded);
}
function encodeData({ data, primaryType, types }) {
  const encodedTypes = [{ type: "bytes32" }];
  const encodedValues = [hashType({ primaryType, types })];
  for (const field of types[primaryType]) {
    const [type, value] = encodeField({
      types,
      name: field.name,
      type: field.type,
      value: data[field.name]
    });
    encodedTypes.push(type);
    encodedValues.push(value);
  }
  return encodeAbiParameters(encodedTypes, encodedValues);
}
function hashType({ primaryType, types }) {
  const encodedHashType = toHex(encodeType({ primaryType, types }));
  return keccak256(encodedHashType);
}
function encodeType({ primaryType, types }) {
  let result = "";
  const unsortedDeps = findTypeDependencies({ primaryType, types });
  unsortedDeps.delete(primaryType);
  const deps = [primaryType, ...Array.from(unsortedDeps).sort()];
  for (const type of deps) {
    result += `${type}(${types[type].map(({ name, type: t }) => `${t} ${name}`).join(",")})`;
  }
  return result;
}
function findTypeDependencies({ primaryType: primaryType_, types }, results = /* @__PURE__ */ new Set()) {
  const match = primaryType_.match(/^\w*/u);
  const primaryType = match?.[0];
  if (results.has(primaryType) || types[primaryType] === void 0) {
    return results;
  }
  results.add(primaryType);
  for (const field of types[primaryType]) {
    findTypeDependencies({ primaryType: field.type, types }, results);
  }
  return results;
}
function encodeField({ types, name, type, value }) {
  if (types[type] !== void 0) {
    return [
      { type: "bytes32" },
      keccak256(encodeData({ data: value, primaryType: type, types }))
    ];
  }
  if (type === "bytes") {
    const prepend = value.length % 2 ? "0" : "";
    value = `0x${prepend + value.slice(2)}`;
    return [{ type: "bytes32" }, keccak256(value)];
  }
  if (type === "string")
    return [{ type: "bytes32" }, keccak256(toHex(value))];
  if (type.lastIndexOf("]") === type.length - 1) {
    const parsedType = type.slice(0, type.lastIndexOf("["));
    const typeValuePairs = value.map((item) => encodeField({
      name,
      type: parsedType,
      types,
      value: item
    }));
    return [
      { type: "bytes32" },
      keccak256(encodeAbiParameters(typeValuePairs.map(([t]) => t), typeValuePairs.map(([, v]) => v)))
    ];
  }
  return [{ type }, value];
}

// ../../node_modules/viem/_esm/utils/typedData.js
function serializeTypedData(parameters) {
  const { domain: domain_, message: message_, primaryType, types } = parameters;
  const normalizeData = (struct, data_) => {
    const data = { ...data_ };
    for (const param of struct) {
      const { name, type } = param;
      if (type === "address")
        data[name] = data[name].toLowerCase();
    }
    return data;
  };
  const domain = (() => {
    if (!types.EIP712Domain)
      return {};
    if (!domain_)
      return {};
    return normalizeData(types.EIP712Domain, domain_);
  })();
  const message = (() => {
    if (primaryType === "EIP712Domain")
      return void 0;
    return normalizeData(types[primaryType], message_);
  })();
  return stringify({ domain, message, primaryType, types });
}
function validateTypedData(parameters) {
  const { domain, message, primaryType, types } = parameters;
  const validateData = (struct, data) => {
    for (const param of struct) {
      const { name, type } = param;
      const value = data[name];
      const integerMatch = type.match(integerRegex);
      if (integerMatch && (typeof value === "number" || typeof value === "bigint")) {
        const [_type, base, size_] = integerMatch;
        numberToHex(value, {
          signed: base === "int",
          size: Number.parseInt(size_) / 8
        });
      }
      if (type === "address" && typeof value === "string" && !isAddress(value))
        throw new InvalidAddressError({ address: value });
      const bytesMatch = type.match(bytesRegex);
      if (bytesMatch) {
        const [_type, size_] = bytesMatch;
        if (size_ && size(value) !== Number.parseInt(size_))
          throw new BytesSizeMismatchError({
            expectedSize: Number.parseInt(size_),
            givenSize: size(value)
          });
      }
      const struct2 = types[type];
      if (struct2) {
        validateReference(type);
        validateData(struct2, value);
      }
    }
  };
  if (types.EIP712Domain && domain) {
    if (typeof domain !== "object")
      throw new InvalidDomainError({ domain });
    validateData(types.EIP712Domain, domain);
  }
  if (primaryType !== "EIP712Domain") {
    if (types[primaryType])
      validateData(types[primaryType], message);
    else
      throw new InvalidPrimaryTypeError({ primaryType, types });
  }
}
function getTypesForEIP712Domain({ domain }) {
  return [
    typeof domain?.name === "string" && { name: "name", type: "string" },
    domain?.version && { name: "version", type: "string" },
    typeof domain?.chainId === "number" && {
      name: "chainId",
      type: "uint256"
    },
    domain?.verifyingContract && {
      name: "verifyingContract",
      type: "address"
    },
    domain?.salt && { name: "salt", type: "bytes32" }
  ].filter(Boolean);
}
function validateReference(type) {
  if (type === "address" || type === "bool" || type === "string" || type.startsWith("bytes") || type.startsWith("uint") || type.startsWith("int"))
    throw new InvalidStructTypeError({ type });
}

// ../../node_modules/viem/_esm/utils/index.js
import { parseAbi, parseAbiItem, parseAbiParameter, parseAbiParameters } from "abitype";

// ../../node_modules/viem/_esm/utils/formatters/transactionReceipt.js
var receiptStatuses = {
  "0x0": "reverted",
  "0x1": "success"
};
function formatTransactionReceipt(transactionReceipt) {
  const receipt = {
    ...transactionReceipt,
    blockNumber: transactionReceipt.blockNumber ? BigInt(transactionReceipt.blockNumber) : null,
    contractAddress: transactionReceipt.contractAddress ? transactionReceipt.contractAddress : null,
    cumulativeGasUsed: transactionReceipt.cumulativeGasUsed ? BigInt(transactionReceipt.cumulativeGasUsed) : null,
    effectiveGasPrice: transactionReceipt.effectiveGasPrice ? BigInt(transactionReceipt.effectiveGasPrice) : null,
    gasUsed: transactionReceipt.gasUsed ? BigInt(transactionReceipt.gasUsed) : null,
    logs: transactionReceipt.logs ? transactionReceipt.logs.map((log) => formatLog(log)) : null,
    to: transactionReceipt.to ? transactionReceipt.to : null,
    transactionIndex: transactionReceipt.transactionIndex ? hexToNumber(transactionReceipt.transactionIndex) : null,
    status: transactionReceipt.status ? receiptStatuses[transactionReceipt.status] : null,
    type: transactionReceipt.type ? transactionType[transactionReceipt.type] || transactionReceipt.type : null
  };
  if (transactionReceipt.blobGasPrice)
    receipt.blobGasPrice = BigInt(transactionReceipt.blobGasPrice);
  if (transactionReceipt.blobGasUsed)
    receipt.blobGasUsed = BigInt(transactionReceipt.blobGasUsed);
  return receipt;
}
var defineTransactionReceipt = /* @__PURE__ */ defineFormatter("transactionReceipt", formatTransactionReceipt);

// ../../node_modules/viem/_esm/constants/strings.js
var presignMessagePrefix = "Ethereum Signed Message:\n";

// ../../node_modules/viem/_esm/utils/signature/toPrefixedMessage.js
function toPrefixedMessage(message_) {
  const message = (() => {
    if (typeof message_ === "string")
      return stringToHex(message_);
    if (typeof message_.raw === "string")
      return message_.raw;
    return bytesToHex(message_.raw);
  })();
  const prefix = stringToHex(`${presignMessagePrefix}${size(message)}`);
  return concat([prefix, message]);
}

// ../../node_modules/viem/_esm/utils/signature/hashMessage.js
function hashMessage(message, to_) {
  return keccak256(toPrefixedMessage(message), to_);
}

// ../../node_modules/viem/_esm/constants/bytes.js
var erc6492MagicBytes = "0x6492649264926492649264926492649264926492649264926492649264926492";

// ../../node_modules/viem/_esm/utils/signature/isErc6492Signature.js
function isErc6492Signature(signature) {
  return sliceHex(signature, -32) === erc6492MagicBytes;
}

// ../../node_modules/viem/_esm/utils/signature/serializeErc6492Signature.js
function serializeErc6492Signature(parameters) {
  const { address, data, signature, to = "hex" } = parameters;
  const signature_ = concatHex([
    encodeAbiParameters([{ type: "address" }, { type: "bytes" }, { type: "bytes" }], [address, data, signature]),
    erc6492MagicBytes
  ]);
  if (to === "hex")
    return signature_;
  return hexToBytes(signature_);
}

// ../../node_modules/viem/_esm/utils/transaction/assertTransaction.js
function assertTransactionEIP7702(transaction) {
  const { authorizationList } = transaction;
  if (authorizationList) {
    for (const authorization of authorizationList) {
      const { contractAddress, chainId } = authorization;
      if (!isAddress(contractAddress))
        throw new InvalidAddressError({ address: contractAddress });
      if (chainId < 0)
        throw new InvalidChainIdError({ chainId });
    }
  }
  assertTransactionEIP1559(transaction);
}
function assertTransactionEIP4844(transaction) {
  const { blobVersionedHashes } = transaction;
  if (blobVersionedHashes) {
    if (blobVersionedHashes.length === 0)
      throw new EmptyBlobError();
    for (const hash of blobVersionedHashes) {
      const size_ = size(hash);
      const version = hexToNumber(slice(hash, 0, 1));
      if (size_ !== 32)
        throw new InvalidVersionedHashSizeError({ hash, size: size_ });
      if (version !== versionedHashVersionKzg)
        throw new InvalidVersionedHashVersionError({
          hash,
          version
        });
    }
  }
  assertTransactionEIP1559(transaction);
}
function assertTransactionEIP1559(transaction) {
  const { chainId, maxPriorityFeePerGas, maxFeePerGas, to } = transaction;
  if (chainId <= 0)
    throw new InvalidChainIdError({ chainId });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (maxFeePerGas && maxFeePerGas > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas });
  if (maxPriorityFeePerGas && maxFeePerGas && maxPriorityFeePerGas > maxFeePerGas)
    throw new TipAboveFeeCapError({ maxFeePerGas, maxPriorityFeePerGas });
}
function assertTransactionEIP2930(transaction) {
  const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
  if (chainId <= 0)
    throw new InvalidChainIdError({ chainId });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (maxPriorityFeePerGas || maxFeePerGas)
    throw new BaseError("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid EIP-2930 Transaction attribute.");
  if (gasPrice && gasPrice > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
}
function assertTransactionLegacy(transaction) {
  const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (typeof chainId !== "undefined" && chainId <= 0)
    throw new InvalidChainIdError({ chainId });
  if (maxPriorityFeePerGas || maxFeePerGas)
    throw new BaseError("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction attribute.");
  if (gasPrice && gasPrice > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
}

// ../../node_modules/viem/_esm/experimental/eip7702/utils/serializeAuthorizationList.js
function serializeAuthorizationList(authorizationList) {
  if (!authorizationList || authorizationList.length === 0)
    return [];
  const serializedAuthorizationList = [];
  for (const authorization of authorizationList) {
    const { contractAddress, chainId, nonce, ...signature } = authorization;
    serializedAuthorizationList.push([
      chainId ? toHex(chainId) : "0x",
      contractAddress,
      nonce ? toHex(nonce) : "0x",
      ...toYParitySignatureArray({}, signature)
    ]);
  }
  return serializedAuthorizationList;
}

// ../../node_modules/viem/_esm/utils/transaction/serializeAccessList.js
function serializeAccessList(accessList) {
  if (!accessList || accessList.length === 0)
    return [];
  const serializedAccessList = [];
  for (let i = 0; i < accessList.length; i++) {
    const { address, storageKeys } = accessList[i];
    for (let j = 0; j < storageKeys.length; j++) {
      if (storageKeys[j].length - 2 !== 64) {
        throw new InvalidStorageKeySizeError({ storageKey: storageKeys[j] });
      }
    }
    if (!isAddress(address, { strict: false })) {
      throw new InvalidAddressError({ address });
    }
    serializedAccessList.push([address, storageKeys]);
  }
  return serializedAccessList;
}

// ../../node_modules/viem/_esm/utils/transaction/serializeTransaction.js
function serializeTransaction(transaction, signature) {
  const type = getTransactionType(transaction);
  if (type === "eip1559")
    return serializeTransactionEIP1559(transaction, signature);
  if (type === "eip2930")
    return serializeTransactionEIP2930(transaction, signature);
  if (type === "eip4844")
    return serializeTransactionEIP4844(transaction, signature);
  if (type === "eip7702")
    return serializeTransactionEIP7702(transaction, signature);
  return serializeTransactionLegacy(transaction, signature);
}
function serializeTransactionEIP7702(transaction, signature) {
  const { authorizationList, chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction;
  assertTransactionEIP7702(transaction);
  const serializedAccessList = serializeAccessList(accessList);
  const serializedAuthorizationList = serializeAuthorizationList(authorizationList);
  return concatHex([
    "0x04",
    toRlp([
      toHex(chainId),
      nonce ? toHex(nonce) : "0x",
      maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : "0x",
      maxFeePerGas ? toHex(maxFeePerGas) : "0x",
      gas ? toHex(gas) : "0x",
      to ?? "0x",
      value ? toHex(value) : "0x",
      data ?? "0x",
      serializedAccessList,
      serializedAuthorizationList,
      ...toYParitySignatureArray(transaction, signature)
    ])
  ]);
}
function serializeTransactionEIP4844(transaction, signature) {
  const { chainId, gas, nonce, to, value, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction;
  assertTransactionEIP4844(transaction);
  let blobVersionedHashes = transaction.blobVersionedHashes;
  let sidecars = transaction.sidecars;
  if (transaction.blobs && (typeof blobVersionedHashes === "undefined" || typeof sidecars === "undefined")) {
    const blobs2 = typeof transaction.blobs[0] === "string" ? transaction.blobs : transaction.blobs.map((x) => bytesToHex(x));
    const kzg = transaction.kzg;
    const commitments2 = blobsToCommitments({
      blobs: blobs2,
      kzg
    });
    if (typeof blobVersionedHashes === "undefined")
      blobVersionedHashes = commitmentsToVersionedHashes({
        commitments: commitments2
      });
    if (typeof sidecars === "undefined") {
      const proofs2 = blobsToProofs({ blobs: blobs2, commitments: commitments2, kzg });
      sidecars = toBlobSidecars({ blobs: blobs2, commitments: commitments2, proofs: proofs2 });
    }
  }
  const serializedAccessList = serializeAccessList(accessList);
  const serializedTransaction = [
    toHex(chainId),
    nonce ? toHex(nonce) : "0x",
    maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : "0x",
    maxFeePerGas ? toHex(maxFeePerGas) : "0x",
    gas ? toHex(gas) : "0x",
    to ?? "0x",
    value ? toHex(value) : "0x",
    data ?? "0x",
    serializedAccessList,
    maxFeePerBlobGas ? toHex(maxFeePerBlobGas) : "0x",
    blobVersionedHashes ?? [],
    ...toYParitySignatureArray(transaction, signature)
  ];
  const blobs = [];
  const commitments = [];
  const proofs = [];
  if (sidecars)
    for (let i = 0; i < sidecars.length; i++) {
      const { blob, commitment, proof } = sidecars[i];
      blobs.push(blob);
      commitments.push(commitment);
      proofs.push(proof);
    }
  return concatHex([
    "0x03",
    sidecars ? (
      // If sidecars are enabled, envelope turns into a "wrapper":
      toRlp([serializedTransaction, blobs, commitments, proofs])
    ) : (
      // If sidecars are disabled, standard envelope is used:
      toRlp(serializedTransaction)
    )
  ]);
}
function serializeTransactionEIP1559(transaction, signature) {
  const { chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction;
  assertTransactionEIP1559(transaction);
  const serializedAccessList = serializeAccessList(accessList);
  const serializedTransaction = [
    toHex(chainId),
    nonce ? toHex(nonce) : "0x",
    maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : "0x",
    maxFeePerGas ? toHex(maxFeePerGas) : "0x",
    gas ? toHex(gas) : "0x",
    to ?? "0x",
    value ? toHex(value) : "0x",
    data ?? "0x",
    serializedAccessList,
    ...toYParitySignatureArray(transaction, signature)
  ];
  return concatHex([
    "0x02",
    toRlp(serializedTransaction)
  ]);
}
function serializeTransactionEIP2930(transaction, signature) {
  const { chainId, gas, data, nonce, to, value, accessList, gasPrice } = transaction;
  assertTransactionEIP2930(transaction);
  const serializedAccessList = serializeAccessList(accessList);
  const serializedTransaction = [
    toHex(chainId),
    nonce ? toHex(nonce) : "0x",
    gasPrice ? toHex(gasPrice) : "0x",
    gas ? toHex(gas) : "0x",
    to ?? "0x",
    value ? toHex(value) : "0x",
    data ?? "0x",
    serializedAccessList,
    ...toYParitySignatureArray(transaction, signature)
  ];
  return concatHex([
    "0x01",
    toRlp(serializedTransaction)
  ]);
}
function serializeTransactionLegacy(transaction, signature) {
  const { chainId = 0, gas, data, nonce, to, value, gasPrice } = transaction;
  assertTransactionLegacy(transaction);
  let serializedTransaction = [
    nonce ? toHex(nonce) : "0x",
    gasPrice ? toHex(gasPrice) : "0x",
    gas ? toHex(gas) : "0x",
    to ?? "0x",
    value ? toHex(value) : "0x",
    data ?? "0x"
  ];
  if (signature) {
    const v = (() => {
      if (signature.v >= 35n) {
        const inferredChainId = (signature.v - 35n) / 2n;
        if (inferredChainId > 0)
          return signature.v;
        return 27n + (signature.v === 35n ? 0n : 1n);
      }
      if (chainId > 0)
        return BigInt(chainId * 2) + BigInt(35n + signature.v - 27n);
      const v2 = 27n + (signature.v === 27n ? 0n : 1n);
      if (signature.v !== v2)
        throw new InvalidLegacyVError({ v: signature.v });
      return v2;
    })();
    const r = trim(signature.r);
    const s = trim(signature.s);
    serializedTransaction = [
      ...serializedTransaction,
      toHex(v),
      r === "0x00" ? "0x" : r,
      s === "0x00" ? "0x" : s
    ];
  } else if (chainId > 0) {
    serializedTransaction = [
      ...serializedTransaction,
      toHex(chainId),
      "0x",
      "0x"
    ];
  }
  return toRlp(serializedTransaction);
}
function toYParitySignatureArray(transaction, signature_) {
  const signature = signature_ ?? transaction;
  const { v, yParity } = signature;
  if (typeof signature.r === "undefined")
    return [];
  if (typeof signature.s === "undefined")
    return [];
  if (typeof v === "undefined" && typeof yParity === "undefined")
    return [];
  const r = trim(signature.r);
  const s = trim(signature.s);
  const yParity_ = (() => {
    if (typeof yParity === "number")
      return yParity ? toHex(1) : "0x";
    if (v === 0n)
      return "0x";
    if (v === 1n)
      return toHex(1);
    return v === 27n ? "0x" : toHex(1);
  })();
  return [yParity_, r === "0x00" ? "0x" : r, s === "0x00" ? "0x" : s];
}

// ../../node_modules/viem/_esm/errors/unit.js
var InvalidDecimalNumberError = class extends BaseError {
  constructor({ value }) {
    super(`Number \`${value}\` is not a valid decimal number.`, {
      name: "InvalidDecimalNumberError"
    });
  }
};

// ../../node_modules/viem/_esm/utils/unit/parseUnits.js
function parseUnits(value, decimals) {
  if (!/^(-?)([0-9]*)\.?([0-9]*)$/.test(value))
    throw new InvalidDecimalNumberError({ value });
  let [integer, fraction = "0"] = value.split(".");
  const negative = integer.startsWith("-");
  if (negative)
    integer = integer.slice(1);
  fraction = fraction.replace(/(0+)$/, "");
  if (decimals === 0) {
    if (Math.round(Number(`.${fraction}`)) === 1)
      integer = `${BigInt(integer) + 1n}`;
    fraction = "";
  } else if (fraction.length > decimals) {
    const [left, unit, right] = [
      fraction.slice(0, decimals - 1),
      fraction.slice(decimals - 1, decimals),
      fraction.slice(decimals)
    ];
    const rounded = Math.round(Number(`${unit}.${right}`));
    if (rounded > 9)
      fraction = `${BigInt(left) + BigInt(1)}0`.padStart(left.length + 1, "0");
    else
      fraction = `${left}${rounded}`;
    if (fraction.length > decimals) {
      fraction = fraction.slice(1);
      integer = `${BigInt(integer) + 1n}`;
    }
    fraction = fraction.slice(0, decimals);
  } else {
    fraction = fraction.padEnd(decimals, "0");
  }
  return BigInt(`${negative ? "-" : ""}${integer}${fraction}`);
}

// ../../node_modules/viem/_esm/utils/formatters/proof.js
function formatStorageProof(storageProof) {
  return storageProof.map((proof) => ({
    ...proof,
    value: BigInt(proof.value)
  }));
}
function formatProof(proof) {
  return {
    ...proof,
    balance: proof.balance ? BigInt(proof.balance) : void 0,
    nonce: proof.nonce ? hexToNumber(proof.nonce) : void 0,
    storageProof: proof.storageProof ? formatStorageProof(proof.storageProof) : void 0
  };
}

// ../../node_modules/viem/_esm/actions/public/getProof.js
async function getProof(client, { address, blockNumber, blockTag: blockTag_, storageKeys }) {
  const blockTag = blockTag_ ?? "latest";
  const blockNumberHex = blockNumber !== void 0 ? numberToHex(blockNumber) : void 0;
  const proof = await client.request({
    method: "eth_getProof",
    params: [address, storageKeys, blockNumberHex || blockTag]
  });
  return formatProof(proof);
}

// ../../node_modules/viem/_esm/actions/public/getStorageAt.js
async function getStorageAt(client, { address, blockNumber, blockTag = "latest", slot }) {
  const blockNumberHex = blockNumber !== void 0 ? numberToHex(blockNumber) : void 0;
  const data = await client.request({
    method: "eth_getStorageAt",
    params: [address, slot, blockNumberHex || blockTag]
  });
  return data;
}

// ../../node_modules/viem/_esm/actions/public/getTransaction.js
async function getTransaction(client, { blockHash, blockNumber, blockTag: blockTag_, hash, index: index2 }) {
  const blockTag = blockTag_ || "latest";
  const blockNumberHex = blockNumber !== void 0 ? numberToHex(blockNumber) : void 0;
  let transaction = null;
  if (hash) {
    transaction = await client.request({
      method: "eth_getTransactionByHash",
      params: [hash]
    }, { dedupe: true });
  } else if (blockHash) {
    transaction = await client.request({
      method: "eth_getTransactionByBlockHashAndIndex",
      params: [blockHash, numberToHex(index2)]
    }, { dedupe: true });
  } else if (blockNumberHex || blockTag) {
    transaction = await client.request({
      method: "eth_getTransactionByBlockNumberAndIndex",
      params: [blockNumberHex || blockTag, numberToHex(index2)]
    }, { dedupe: Boolean(blockNumberHex) });
  }
  if (!transaction)
    throw new TransactionNotFoundError({
      blockHash,
      blockNumber,
      blockTag,
      hash,
      index: index2
    });
  const format = client.chain?.formatters?.transaction?.format || formatTransaction;
  return format(transaction);
}

// ../../node_modules/viem/_esm/actions/public/getTransactionConfirmations.js
async function getTransactionConfirmations(client, { hash, transactionReceipt }) {
  const [blockNumber, transaction] = await Promise.all([
    getAction(client, getBlockNumber, "getBlockNumber")({}),
    hash ? getAction(client, getTransaction, "getTransaction")({ hash }) : void 0
  ]);
  const transactionBlockNumber = transactionReceipt?.blockNumber || transaction?.blockNumber;
  if (!transactionBlockNumber)
    return 0n;
  return blockNumber - transactionBlockNumber + 1n;
}

// ../../node_modules/viem/_esm/actions/public/getTransactionReceipt.js
async function getTransactionReceipt(client, { hash }) {
  const receipt = await client.request({
    method: "eth_getTransactionReceipt",
    params: [hash]
  }, { dedupe: true });
  if (!receipt)
    throw new TransactionReceiptNotFoundError({ hash });
  const format = client.chain?.formatters?.transactionReceipt?.format || formatTransactionReceipt;
  return format(receipt);
}

// ../../node_modules/viem/_esm/actions/public/multicall.js
async function multicall(client, parameters) {
  const { allowFailure = true, batchSize: batchSize_, blockNumber, blockTag, multicallAddress: multicallAddress_, stateOverride } = parameters;
  const contracts2 = parameters.contracts;
  const batchSize = batchSize_ ?? (typeof client.batch?.multicall === "object" && client.batch.multicall.batchSize || 1024);
  let multicallAddress = multicallAddress_;
  if (!multicallAddress) {
    if (!client.chain)
      throw new Error("client chain not configured. multicallAddress is required.");
    multicallAddress = getChainContractAddress({
      blockNumber,
      chain: client.chain,
      contract: "multicall3"
    });
  }
  const chunkedCalls = [[]];
  let currentChunk = 0;
  let currentChunkSize = 0;
  for (let i = 0; i < contracts2.length; i++) {
    const { abi: abi2, address, args, functionName } = contracts2[i];
    try {
      const callData = encodeFunctionData({ abi: abi2, args, functionName });
      currentChunkSize += (callData.length - 2) / 2;
      if (
        // Check if batching is enabled.
        batchSize > 0 && // Check if the current size of the batch exceeds the size limit.
        currentChunkSize > batchSize && // Check if the current chunk is not already empty.
        chunkedCalls[currentChunk].length > 0
      ) {
        currentChunk++;
        currentChunkSize = (callData.length - 2) / 2;
        chunkedCalls[currentChunk] = [];
      }
      chunkedCalls[currentChunk] = [
        ...chunkedCalls[currentChunk],
        {
          allowFailure: true,
          callData,
          target: address
        }
      ];
    } catch (err) {
      const error = getContractError(err, {
        abi: abi2,
        address,
        args,
        docsPath: "/docs/contract/multicall",
        functionName
      });
      if (!allowFailure)
        throw error;
      chunkedCalls[currentChunk] = [
        ...chunkedCalls[currentChunk],
        {
          allowFailure: true,
          callData: "0x",
          target: address
        }
      ];
    }
  }
  const aggregate3Results = await Promise.allSettled(chunkedCalls.map((calls) => getAction(client, readContract, "readContract")({
    abi: multicall3Abi,
    address: multicallAddress,
    args: [calls],
    blockNumber,
    blockTag,
    functionName: "aggregate3",
    stateOverride
  })));
  const results = [];
  for (let i = 0; i < aggregate3Results.length; i++) {
    const result = aggregate3Results[i];
    if (result.status === "rejected") {
      if (!allowFailure)
        throw result.reason;
      for (let j = 0; j < chunkedCalls[i].length; j++) {
        results.push({
          status: "failure",
          error: result.reason,
          result: void 0
        });
      }
      continue;
    }
    const aggregate3Result = result.value;
    for (let j = 0; j < aggregate3Result.length; j++) {
      const { returnData, success } = aggregate3Result[j];
      const { callData } = chunkedCalls[i][j];
      const { abi: abi2, address, functionName, args } = contracts2[results.length];
      try {
        if (callData === "0x")
          throw new AbiDecodingZeroDataError();
        if (!success)
          throw new RawContractError({ data: returnData });
        const result2 = decodeFunctionResult({
          abi: abi2,
          args,
          data: returnData,
          functionName
        });
        results.push(allowFailure ? { result: result2, status: "success" } : result2);
      } catch (err) {
        const error = getContractError(err, {
          abi: abi2,
          address,
          args,
          docsPath: "/docs/contract/multicall",
          functionName
        });
        if (!allowFailure)
          throw error;
        results.push({ error, result: void 0, status: "failure" });
      }
    }
  }
  if (results.length !== contracts2.length)
    throw new BaseError("multicall results mismatch");
  return results;
}

// ../../node_modules/viem/_esm/utils/signature/serializeSignature.js
import { secp256k1 } from "@noble/curves/secp256k1";
function serializeSignature({ r, s, to = "hex", v, yParity }) {
  const yParity_ = (() => {
    if (yParity === 0 || yParity === 1)
      return yParity;
    if (v && (v === 27n || v === 28n || v >= 35n))
      return v % 2n === 0n ? 1 : 0;
    throw new Error("Invalid `v` or `yParity` value");
  })();
  const signature = `0x${new secp256k1.Signature(hexToBigInt(r), hexToBigInt(s)).toCompactHex()}${yParity_ === 0 ? "1b" : "1c"}`;
  if (to === "hex")
    return signature;
  return hexToBytes(signature);
}

// ../../node_modules/viem/_esm/actions/public/verifyHash.js
async function verifyHash(client, parameters) {
  const { address, factory, factoryData, hash, signature, universalSignatureVerifierAddress = client.chain?.contracts?.universalSignatureVerifier?.address, ...rest } = parameters;
  const signatureHex = (() => {
    if (isHex(signature))
      return signature;
    if (typeof signature === "object" && "r" in signature && "s" in signature)
      return serializeSignature(signature);
    return bytesToHex(signature);
  })();
  const wrappedSignature = await (async () => {
    if (!factory && !factoryData)
      return signatureHex;
    if (isErc6492Signature(signatureHex))
      return signatureHex;
    return serializeErc6492Signature({
      address: factory,
      data: factoryData,
      signature: signatureHex
    });
  })();
  try {
    const args = universalSignatureVerifierAddress ? {
      to: universalSignatureVerifierAddress,
      data: encodeFunctionData({
        abi: universalSignatureValidatorAbi,
        functionName: "isValidSig",
        args: [address, hash, wrappedSignature]
      }),
      ...rest
    } : {
      data: encodeDeployData({
        abi: universalSignatureValidatorAbi,
        args: [address, hash, wrappedSignature],
        bytecode: universalSignatureValidatorByteCode
      }),
      ...rest
    };
    const { data } = await getAction(client, call, "call")(args);
    return hexToBool(data ?? "0x0");
  } catch (error) {
    try {
      const verified = isAddressEqual(getAddress(address), await recoverAddress({ hash, signature }));
      if (verified)
        return true;
    } catch {
    }
    if (error instanceof CallExecutionError) {
      return false;
    }
    throw error;
  }
}

// ../../node_modules/viem/_esm/actions/public/verifyMessage.js
async function verifyMessage(client, { address, message, factory, factoryData, signature, ...callRequest }) {
  const hash = hashMessage(message);
  return verifyHash(client, {
    address,
    factory,
    factoryData,
    hash,
    signature,
    ...callRequest
  });
}

// ../../node_modules/viem/_esm/actions/public/verifyTypedData.js
async function verifyTypedData(client, parameters) {
  const { address, factory, factoryData, signature, message, primaryType, types, domain, ...callRequest } = parameters;
  const hash = hashTypedData({ message, primaryType, types, domain });
  return verifyHash(client, {
    address,
    factory,
    factoryData,
    hash,
    signature,
    ...callRequest
  });
}

// ../../node_modules/viem/_esm/actions/public/watchBlockNumber.js
function watchBlockNumber(client, { emitOnBegin = false, emitMissed = false, onBlockNumber, onError, poll: poll_, pollingInterval = client.pollingInterval }) {
  const enablePolling = (() => {
    if (typeof poll_ !== "undefined")
      return poll_;
    if (client.transport.type === "webSocket")
      return false;
    if (client.transport.type === "fallback" && client.transport.transports[0].config.type === "webSocket")
      return false;
    return true;
  })();
  let prevBlockNumber;
  const pollBlockNumber = () => {
    const observerId = stringify([
      "watchBlockNumber",
      client.uid,
      emitOnBegin,
      emitMissed,
      pollingInterval
    ]);
    return observe(observerId, { onBlockNumber, onError }, (emit) => poll(async () => {
      try {
        const blockNumber = await getAction(client, getBlockNumber, "getBlockNumber")({ cacheTime: 0 });
        if (prevBlockNumber) {
          if (blockNumber === prevBlockNumber)
            return;
          if (blockNumber - prevBlockNumber > 1 && emitMissed) {
            for (let i = prevBlockNumber + 1n; i < blockNumber; i++) {
              emit.onBlockNumber(i, prevBlockNumber);
              prevBlockNumber = i;
            }
          }
        }
        if (!prevBlockNumber || blockNumber > prevBlockNumber) {
          emit.onBlockNumber(blockNumber, prevBlockNumber);
          prevBlockNumber = blockNumber;
        }
      } catch (err) {
        emit.onError?.(err);
      }
    }, {
      emitOnBegin,
      interval: pollingInterval
    }));
  };
  const subscribeBlockNumber = () => {
    const observerId = stringify([
      "watchBlockNumber",
      client.uid,
      emitOnBegin,
      emitMissed
    ]);
    return observe(observerId, { onBlockNumber, onError }, (emit) => {
      let active = true;
      let unsubscribe = () => active = false;
      (async () => {
        try {
          const transport = (() => {
            if (client.transport.type === "fallback") {
              const transport2 = client.transport.transports.find((transport3) => transport3.config.type === "webSocket");
              if (!transport2)
                return client.transport;
              return transport2.value;
            }
            return client.transport;
          })();
          const { unsubscribe: unsubscribe_ } = await transport.subscribe({
            params: ["newHeads"],
            onData(data) {
              if (!active)
                return;
              const blockNumber = hexToBigInt(data.result?.number);
              emit.onBlockNumber(blockNumber, prevBlockNumber);
              prevBlockNumber = blockNumber;
            },
            onError(error) {
              emit.onError?.(error);
            }
          });
          unsubscribe = unsubscribe_;
          if (!active)
            unsubscribe();
        } catch (err) {
          onError?.(err);
        }
      })();
      return () => unsubscribe();
    });
  };
  return enablePolling ? pollBlockNumber() : subscribeBlockNumber();
}

// ../../node_modules/viem/_esm/actions/public/waitForTransactionReceipt.js
async function waitForTransactionReceipt(client, {
  confirmations = 1,
  hash,
  onReplaced,
  pollingInterval = client.pollingInterval,
  retryCount = 6,
  retryDelay = ({ count }) => ~~(1 << count) * 200,
  // exponential backoff
  timeout = 18e4
}) {
  const observerId = stringify(["waitForTransactionReceipt", client.uid, hash]);
  let transaction;
  let replacedTransaction;
  let receipt;
  let retrying = false;
  const { promise, resolve, reject } = withResolvers();
  const timer = timeout ? setTimeout(() => reject(new WaitForTransactionReceiptTimeoutError({ hash })), timeout) : void 0;
  const _unobserve = observe(observerId, { onReplaced, resolve, reject }, (emit) => {
    const _unwatch = getAction(client, watchBlockNumber, "watchBlockNumber")({
      emitMissed: true,
      emitOnBegin: true,
      poll: true,
      pollingInterval,
      async onBlockNumber(blockNumber_) {
        const done = (fn) => {
          clearTimeout(timer);
          _unwatch();
          fn();
          _unobserve();
        };
        let blockNumber = blockNumber_;
        if (retrying)
          return;
        try {
          if (receipt) {
            if (confirmations > 1 && (!receipt.blockNumber || blockNumber - receipt.blockNumber + 1n < confirmations))
              return;
            done(() => emit.resolve(receipt));
            return;
          }
          if (!transaction) {
            retrying = true;
            await withRetry(async () => {
              transaction = await getAction(client, getTransaction, "getTransaction")({ hash });
              if (transaction.blockNumber)
                blockNumber = transaction.blockNumber;
            }, {
              delay: retryDelay,
              retryCount
            });
            retrying = false;
          }
          receipt = await getAction(client, getTransactionReceipt, "getTransactionReceipt")({ hash });
          if (confirmations > 1 && (!receipt.blockNumber || blockNumber - receipt.blockNumber + 1n < confirmations))
            return;
          done(() => emit.resolve(receipt));
        } catch (err) {
          if (err instanceof TransactionNotFoundError || err instanceof TransactionReceiptNotFoundError) {
            if (!transaction) {
              retrying = false;
              return;
            }
            try {
              replacedTransaction = transaction;
              retrying = true;
              const block = await withRetry(() => getAction(client, getBlock, "getBlock")({
                blockNumber,
                includeTransactions: true
              }), {
                delay: retryDelay,
                retryCount,
                shouldRetry: ({ error }) => error instanceof BlockNotFoundError
              });
              retrying = false;
              const replacementTransaction = block.transactions.find(({ from, nonce }) => from === replacedTransaction.from && nonce === replacedTransaction.nonce);
              if (!replacementTransaction)
                return;
              receipt = await getAction(client, getTransactionReceipt, "getTransactionReceipt")({
                hash: replacementTransaction.hash
              });
              if (confirmations > 1 && (!receipt.blockNumber || blockNumber - receipt.blockNumber + 1n < confirmations))
                return;
              let reason = "replaced";
              if (replacementTransaction.to === replacedTransaction.to && replacementTransaction.value === replacedTransaction.value) {
                reason = "repriced";
              } else if (replacementTransaction.from === replacementTransaction.to && replacementTransaction.value === 0n) {
                reason = "cancelled";
              }
              done(() => {
                emit.onReplaced?.({
                  reason,
                  replacedTransaction,
                  transaction: replacementTransaction,
                  transactionReceipt: receipt
                });
                emit.resolve(receipt);
              });
            } catch (err_) {
              done(() => emit.reject(err_));
            }
          } else {
            done(() => emit.reject(err));
          }
        }
      }
    });
  });
  return promise;
}

// ../../node_modules/viem/_esm/actions/public/watchBlocks.js
function watchBlocks(client, { blockTag = "latest", emitMissed = false, emitOnBegin = false, onBlock, onError, includeTransactions: includeTransactions_, poll: poll_, pollingInterval = client.pollingInterval }) {
  const enablePolling = (() => {
    if (typeof poll_ !== "undefined")
      return poll_;
    if (client.transport.type === "webSocket")
      return false;
    if (client.transport.type === "fallback" && client.transport.transports[0].config.type === "webSocket")
      return false;
    return true;
  })();
  const includeTransactions = includeTransactions_ ?? false;
  let prevBlock;
  const pollBlocks = () => {
    const observerId = stringify([
      "watchBlocks",
      client.uid,
      blockTag,
      emitMissed,
      emitOnBegin,
      includeTransactions,
      pollingInterval
    ]);
    return observe(observerId, { onBlock, onError }, (emit) => poll(async () => {
      try {
        const block = await getAction(client, getBlock, "getBlock")({
          blockTag,
          includeTransactions
        });
        if (block.number && prevBlock?.number) {
          if (block.number === prevBlock.number)
            return;
          if (block.number - prevBlock.number > 1 && emitMissed) {
            for (let i = prevBlock?.number + 1n; i < block.number; i++) {
              const block2 = await getAction(client, getBlock, "getBlock")({
                blockNumber: i,
                includeTransactions
              });
              emit.onBlock(block2, prevBlock);
              prevBlock = block2;
            }
          }
        }
        if (
          // If no previous block exists, emit.
          !prevBlock?.number || // If the block tag is "pending" with no block number, emit.
          blockTag === "pending" && !block?.number || // If the next block number is greater than the previous block number, emit.
          // We don't want to emit blocks in the past.
          block.number && block.number > prevBlock.number
        ) {
          emit.onBlock(block, prevBlock);
          prevBlock = block;
        }
      } catch (err) {
        emit.onError?.(err);
      }
    }, {
      emitOnBegin,
      interval: pollingInterval
    }));
  };
  const subscribeBlocks = () => {
    let active = true;
    let emitFetched = true;
    let unsubscribe = () => active = false;
    (async () => {
      try {
        if (emitOnBegin) {
          getAction(client, getBlock, "getBlock")({
            blockTag,
            includeTransactions
          }).then((block) => {
            if (!active)
              return;
            if (!emitFetched)
              return;
            onBlock(block, void 0);
            emitFetched = false;
          });
        }
        const transport = (() => {
          if (client.transport.type === "fallback") {
            const transport2 = client.transport.transports.find((transport3) => transport3.config.type === "webSocket");
            if (!transport2)
              return client.transport;
            return transport2.value;
          }
          return client.transport;
        })();
        const { unsubscribe: unsubscribe_ } = await transport.subscribe({
          params: ["newHeads"],
          async onData(data) {
            if (!active)
              return;
            const block = await getAction(client, getBlock, "getBlock")({
              blockNumber: data.blockNumber,
              includeTransactions
            }).catch(() => {
            });
            if (!active)
              return;
            onBlock(block, prevBlock);
            emitFetched = false;
            prevBlock = block;
          },
          onError(error) {
            onError?.(error);
          }
        });
        unsubscribe = unsubscribe_;
        if (!active)
          unsubscribe();
      } catch (err) {
        onError?.(err);
      }
    })();
    return () => unsubscribe();
  };
  return enablePolling ? pollBlocks() : subscribeBlocks();
}

// ../../node_modules/viem/_esm/actions/public/watchEvent.js
function watchEvent(client, { address, args, batch = true, event, events, fromBlock, onError, onLogs, poll: poll_, pollingInterval = client.pollingInterval, strict: strict_ }) {
  const enablePolling = (() => {
    if (typeof poll_ !== "undefined")
      return poll_;
    if (typeof fromBlock === "bigint")
      return true;
    if (client.transport.type === "webSocket")
      return false;
    if (client.transport.type === "fallback" && client.transport.transports[0].config.type === "webSocket")
      return false;
    return true;
  })();
  const strict = strict_ ?? false;
  const pollEvent = () => {
    const observerId = stringify([
      "watchEvent",
      address,
      args,
      batch,
      client.uid,
      event,
      pollingInterval,
      fromBlock
    ]);
    return observe(observerId, { onLogs, onError }, (emit) => {
      let previousBlockNumber;
      if (fromBlock !== void 0)
        previousBlockNumber = fromBlock - 1n;
      let filter;
      let initialized = false;
      const unwatch = poll(async () => {
        if (!initialized) {
          try {
            filter = await getAction(client, createEventFilter, "createEventFilter")({
              address,
              args,
              event,
              events,
              strict,
              fromBlock
            });
          } catch {
          }
          initialized = true;
          return;
        }
        try {
          let logs;
          if (filter) {
            logs = await getAction(client, getFilterChanges, "getFilterChanges")({ filter });
          } else {
            const blockNumber = await getAction(client, getBlockNumber, "getBlockNumber")({});
            if (previousBlockNumber && previousBlockNumber !== blockNumber) {
              logs = await getAction(client, getLogs, "getLogs")({
                address,
                args,
                event,
                events,
                fromBlock: previousBlockNumber + 1n,
                toBlock: blockNumber
              });
            } else {
              logs = [];
            }
            previousBlockNumber = blockNumber;
          }
          if (logs.length === 0)
            return;
          if (batch)
            emit.onLogs(logs);
          else
            for (const log of logs)
              emit.onLogs([log]);
        } catch (err) {
          if (filter && err instanceof InvalidInputRpcError)
            initialized = false;
          emit.onError?.(err);
        }
      }, {
        emitOnBegin: true,
        interval: pollingInterval
      });
      return async () => {
        if (filter)
          await getAction(client, uninstallFilter, "uninstallFilter")({ filter });
        unwatch();
      };
    });
  };
  const subscribeEvent = () => {
    let active = true;
    let unsubscribe = () => active = false;
    (async () => {
      try {
        const transport = (() => {
          if (client.transport.type === "fallback") {
            const transport2 = client.transport.transports.find((transport3) => transport3.config.type === "webSocket");
            if (!transport2)
              return client.transport;
            return transport2.value;
          }
          return client.transport;
        })();
        const events_ = events ?? (event ? [event] : void 0);
        let topics = [];
        if (events_) {
          const encoded = events_.flatMap((event2) => encodeEventTopics({
            abi: [event2],
            eventName: event2.name,
            args
          }));
          topics = [encoded];
          if (event)
            topics = topics[0];
        }
        const { unsubscribe: unsubscribe_ } = await transport.subscribe({
          params: ["logs", { address, topics }],
          onData(data) {
            if (!active)
              return;
            const log = data.result;
            try {
              const { eventName, args: args2 } = decodeEventLog({
                abi: events_ ?? [],
                data: log.data,
                topics: log.topics,
                strict
              });
              const formatted = formatLog(log, { args: args2, eventName });
              onLogs([formatted]);
            } catch (err) {
              let eventName;
              let isUnnamed;
              if (err instanceof DecodeLogDataMismatch || err instanceof DecodeLogTopicsMismatch) {
                if (strict_)
                  return;
                eventName = err.abiItem.name;
                isUnnamed = err.abiItem.inputs?.some((x) => !("name" in x && x.name));
              }
              const formatted = formatLog(log, {
                args: isUnnamed ? [] : {},
                eventName
              });
              onLogs([formatted]);
            }
          },
          onError(error) {
            onError?.(error);
          }
        });
        unsubscribe = unsubscribe_;
        if (!active)
          unsubscribe();
      } catch (err) {
        onError?.(err);
      }
    })();
    return () => unsubscribe();
  };
  return enablePolling ? pollEvent() : subscribeEvent();
}

// ../../node_modules/viem/_esm/actions/public/watchPendingTransactions.js
function watchPendingTransactions(client, { batch = true, onError, onTransactions, poll: poll_, pollingInterval = client.pollingInterval }) {
  const enablePolling = typeof poll_ !== "undefined" ? poll_ : client.transport.type !== "webSocket";
  const pollPendingTransactions = () => {
    const observerId = stringify([
      "watchPendingTransactions",
      client.uid,
      batch,
      pollingInterval
    ]);
    return observe(observerId, { onTransactions, onError }, (emit) => {
      let filter;
      const unwatch = poll(async () => {
        try {
          if (!filter) {
            try {
              filter = await getAction(client, createPendingTransactionFilter, "createPendingTransactionFilter")({});
              return;
            } catch (err) {
              unwatch();
              throw err;
            }
          }
          const hashes = await getAction(client, getFilterChanges, "getFilterChanges")({ filter });
          if (hashes.length === 0)
            return;
          if (batch)
            emit.onTransactions(hashes);
          else
            for (const hash of hashes)
              emit.onTransactions([hash]);
        } catch (err) {
          emit.onError?.(err);
        }
      }, {
        emitOnBegin: true,
        interval: pollingInterval
      });
      return async () => {
        if (filter)
          await getAction(client, uninstallFilter, "uninstallFilter")({ filter });
        unwatch();
      };
    });
  };
  const subscribePendingTransactions = () => {
    let active = true;
    let unsubscribe = () => active = false;
    (async () => {
      try {
        const { unsubscribe: unsubscribe_ } = await client.transport.subscribe({
          params: ["newPendingTransactions"],
          onData(data) {
            if (!active)
              return;
            const transaction = data.result;
            onTransactions([transaction]);
          },
          onError(error) {
            onError?.(error);
          }
        });
        unsubscribe = unsubscribe_;
        if (!active)
          unsubscribe();
      } catch (err) {
        onError?.(err);
      }
    })();
    return () => unsubscribe();
  };
  return enablePolling ? pollPendingTransactions() : subscribePendingTransactions();
}

// ../../node_modules/viem/_esm/utils/siwe/parseSiweMessage.js
function parseSiweMessage(message) {
  const { scheme, statement, ...prefix } = message.match(prefixRegex)?.groups ?? {};
  const { chainId, expirationTime, issuedAt, notBefore, requestId, ...suffix } = message.match(suffixRegex)?.groups ?? {};
  const resources = message.split("Resources:")[1]?.split("\n- ").slice(1);
  return {
    ...prefix,
    ...suffix,
    ...chainId ? { chainId: Number(chainId) } : {},
    ...expirationTime ? { expirationTime: new Date(expirationTime) } : {},
    ...issuedAt ? { issuedAt: new Date(issuedAt) } : {},
    ...notBefore ? { notBefore: new Date(notBefore) } : {},
    ...requestId ? { requestId } : {},
    ...resources ? { resources } : {},
    ...scheme ? { scheme } : {},
    ...statement ? { statement } : {}
  };
}
var prefixRegex = /^(?:(?<scheme>[a-zA-Z][a-zA-Z0-9+-.]*):\/\/)?(?<domain>[a-zA-Z0-9+-.]*(?::[0-9]{1,5})?) (?:wants you to sign in with your Ethereum account:\n)(?<address>0x[a-fA-F0-9]{40})\n\n(?:(?<statement>.*)\n\n)?/;
var suffixRegex = /(?:URI: (?<uri>.+))\n(?:Version: (?<version>.+))\n(?:Chain ID: (?<chainId>\d+))\n(?:Nonce: (?<nonce>[a-zA-Z0-9]+))\n(?:Issued At: (?<issuedAt>.+))(?:\nExpiration Time: (?<expirationTime>.+))?(?:\nNot Before: (?<notBefore>.+))?(?:\nRequest ID: (?<requestId>.+))?/;

// ../../node_modules/viem/_esm/utils/siwe/validateSiweMessage.js
function validateSiweMessage(parameters) {
  const { address, domain, message, nonce, scheme, time = /* @__PURE__ */ new Date() } = parameters;
  if (domain && message.domain !== domain)
    return false;
  if (nonce && message.nonce !== nonce)
    return false;
  if (scheme && message.scheme !== scheme)
    return false;
  if (message.expirationTime && time >= message.expirationTime)
    return false;
  if (message.notBefore && time < message.notBefore)
    return false;
  try {
    if (!message.address)
      return false;
    if (address && !isAddressEqual(message.address, address))
      return false;
  } catch {
    return false;
  }
  return true;
}

// ../../node_modules/viem/_esm/actions/siwe/verifySiweMessage.js
async function verifySiweMessage(client, parameters) {
  const { address, domain, message, nonce, scheme, signature, time = /* @__PURE__ */ new Date(), ...callRequest } = parameters;
  const parsed = parseSiweMessage(message);
  if (!parsed.address)
    return false;
  const isValid = validateSiweMessage({
    address,
    domain,
    message: parsed,
    nonce,
    scheme,
    time
  });
  if (!isValid)
    return false;
  const hash = hashMessage(message);
  return verifyHash(client, {
    address: parsed.address,
    hash,
    signature,
    ...callRequest
  });
}

// ../../node_modules/viem/_esm/clients/decorators/public.js
function publicActions(client) {
  return {
    call: (args) => call(client, args),
    createBlockFilter: () => createBlockFilter(client),
    createContractEventFilter: (args) => createContractEventFilter(client, args),
    createEventFilter: (args) => createEventFilter(client, args),
    createPendingTransactionFilter: () => createPendingTransactionFilter(client),
    estimateContractGas: (args) => estimateContractGas(client, args),
    estimateGas: (args) => estimateGas(client, args),
    getBalance: (args) => getBalance(client, args),
    getBlobBaseFee: () => getBlobBaseFee(client),
    getBlock: (args) => getBlock(client, args),
    getBlockNumber: (args) => getBlockNumber(client, args),
    getBlockTransactionCount: (args) => getBlockTransactionCount(client, args),
    getBytecode: (args) => getCode(client, args),
    getChainId: () => getChainId(client),
    getCode: (args) => getCode(client, args),
    getContractEvents: (args) => getContractEvents(client, args),
    getEip712Domain: (args) => getEip712Domain(client, args),
    getEnsAddress: (args) => getEnsAddress(client, args),
    getEnsAvatar: (args) => getEnsAvatar(client, args),
    getEnsName: (args) => getEnsName(client, args),
    getEnsResolver: (args) => getEnsResolver(client, args),
    getEnsText: (args) => getEnsText(client, args),
    getFeeHistory: (args) => getFeeHistory(client, args),
    estimateFeesPerGas: (args) => estimateFeesPerGas(client, args),
    getFilterChanges: (args) => getFilterChanges(client, args),
    getFilterLogs: (args) => getFilterLogs(client, args),
    getGasPrice: () => getGasPrice(client),
    getLogs: (args) => getLogs(client, args),
    getProof: (args) => getProof(client, args),
    estimateMaxPriorityFeePerGas: (args) => estimateMaxPriorityFeePerGas(client, args),
    getStorageAt: (args) => getStorageAt(client, args),
    getTransaction: (args) => getTransaction(client, args),
    getTransactionConfirmations: (args) => getTransactionConfirmations(client, args),
    getTransactionCount: (args) => getTransactionCount(client, args),
    getTransactionReceipt: (args) => getTransactionReceipt(client, args),
    multicall: (args) => multicall(client, args),
    prepareTransactionRequest: (args) => prepareTransactionRequest(client, args),
    readContract: (args) => readContract(client, args),
    sendRawTransaction: (args) => sendRawTransaction(client, args),
    simulateContract: (args) => simulateContract(client, args),
    verifyMessage: (args) => verifyMessage(client, args),
    verifySiweMessage: (args) => verifySiweMessage(client, args),
    verifyTypedData: (args) => verifyTypedData(client, args),
    uninstallFilter: (args) => uninstallFilter(client, args),
    waitForTransactionReceipt: (args) => waitForTransactionReceipt(client, args),
    watchBlocks: (args) => watchBlocks(client, args),
    watchBlockNumber: (args) => watchBlockNumber(client, args),
    watchContractEvent: (args) => watchContractEvent(client, args),
    watchEvent: (args) => watchEvent(client, args),
    watchPendingTransactions: (args) => watchPendingTransactions(client, args)
  };
}

// ../../node_modules/viem/_esm/clients/createPublicClient.js
function createPublicClient(parameters) {
  const { key = "public", name = "Public Client" } = parameters;
  const client = createClient({
    ...parameters,
    key,
    name,
    type: "publicClient"
  });
  return client.extend(publicActions);
}

// ../../node_modules/viem/_esm/actions/wallet/deployContract.js
function deployContract(walletClient, parameters) {
  const { abi: abi2, args, bytecode, ...request } = parameters;
  const calldata = encodeDeployData({ abi: abi2, args, bytecode });
  return sendTransaction(walletClient, {
    ...request,
    data: calldata
  });
}

// ../../node_modules/viem/_esm/actions/wallet/getAddresses.js
async function getAddresses(client) {
  if (client.account?.type === "local")
    return [client.account.address];
  const addresses = await client.request({ method: "eth_accounts" }, { dedupe: true });
  return addresses.map((address) => checksumAddress(address));
}

// ../../node_modules/viem/_esm/actions/wallet/getPermissions.js
async function getPermissions(client) {
  const permissions = await client.request({ method: "wallet_getPermissions" }, { dedupe: true });
  return permissions;
}

// ../../node_modules/viem/_esm/actions/wallet/requestAddresses.js
async function requestAddresses(client) {
  const addresses = await client.request({ method: "eth_requestAccounts" }, { dedupe: true, retryCount: 0 });
  return addresses.map((address) => getAddress(address));
}

// ../../node_modules/viem/_esm/actions/wallet/requestPermissions.js
async function requestPermissions(client, permissions) {
  return client.request({
    method: "wallet_requestPermissions",
    params: [permissions]
  }, { retryCount: 0 });
}

// ../../node_modules/viem/_esm/actions/wallet/signMessage.js
async function signMessage(client, { account: account_ = client.account, message }) {
  if (!account_)
    throw new AccountNotFoundError({
      docsPath: "/docs/actions/wallet/signMessage"
    });
  const account = parseAccount(account_);
  if (account.signMessage)
    return account.signMessage({ message });
  const message_ = (() => {
    if (typeof message === "string")
      return stringToHex(message);
    if (message.raw instanceof Uint8Array)
      return toHex(message.raw);
    return message.raw;
  })();
  return client.request({
    method: "personal_sign",
    params: [message_, account.address]
  }, { retryCount: 0 });
}

// ../../node_modules/viem/_esm/actions/wallet/signTransaction.js
async function signTransaction(client, parameters) {
  const { account: account_ = client.account, chain = client.chain, ...transaction } = parameters;
  if (!account_)
    throw new AccountNotFoundError({
      docsPath: "/docs/actions/wallet/signTransaction"
    });
  const account = parseAccount(account_);
  assertRequest({
    account,
    ...parameters
  });
  const chainId = await getAction(client, getChainId, "getChainId")({});
  if (chain !== null)
    assertCurrentChain({
      currentChainId: chainId,
      chain
    });
  const formatters2 = chain?.formatters || client.chain?.formatters;
  const format = formatters2?.transactionRequest?.format || formatTransactionRequest;
  if (account.signTransaction)
    return account.signTransaction({
      ...transaction,
      chainId
    }, { serializer: client.chain?.serializers?.transaction });
  return await client.request({
    method: "eth_signTransaction",
    params: [
      {
        ...format(transaction),
        chainId: numberToHex(chainId),
        from: account.address
      }
    ]
  }, { retryCount: 0 });
}

// ../../node_modules/viem/_esm/actions/wallet/signTypedData.js
async function signTypedData(client, parameters) {
  const { account: account_ = client.account, domain, message, primaryType } = parameters;
  if (!account_)
    throw new AccountNotFoundError({
      docsPath: "/docs/actions/wallet/signTypedData"
    });
  const account = parseAccount(account_);
  const types = {
    EIP712Domain: getTypesForEIP712Domain({ domain }),
    ...parameters.types
  };
  validateTypedData({ domain, message, primaryType, types });
  if (account.signTypedData)
    return account.signTypedData({ domain, message, primaryType, types });
  const typedData = serializeTypedData({ domain, message, primaryType, types });
  return client.request({
    method: "eth_signTypedData_v4",
    params: [account.address, typedData]
  }, { retryCount: 0 });
}

// ../../node_modules/viem/_esm/actions/wallet/switchChain.js
async function switchChain(client, { id }) {
  await client.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: numberToHex(id)
      }
    ]
  }, { retryCount: 0 });
}

// ../../node_modules/viem/_esm/actions/wallet/watchAsset.js
async function watchAsset(client, params) {
  const added = await client.request({
    method: "wallet_watchAsset",
    params
  }, { retryCount: 0 });
  return added;
}

// ../../node_modules/viem/_esm/clients/decorators/wallet.js
function walletActions(client) {
  return {
    addChain: (args) => addChain(client, args),
    deployContract: (args) => deployContract(client, args),
    getAddresses: () => getAddresses(client),
    getChainId: () => getChainId(client),
    getPermissions: () => getPermissions(client),
    prepareTransactionRequest: (args) => prepareTransactionRequest(client, args),
    requestAddresses: () => requestAddresses(client),
    requestPermissions: (args) => requestPermissions(client, args),
    sendRawTransaction: (args) => sendRawTransaction(client, args),
    sendTransaction: (args) => sendTransaction(client, args),
    signMessage: (args) => signMessage(client, args),
    signTransaction: (args) => signTransaction(client, args),
    signTypedData: (args) => signTypedData(client, args),
    switchChain: (args) => switchChain(client, args),
    watchAsset: (args) => watchAsset(client, args),
    writeContract: (args) => writeContract(client, args)
  };
}

// ../../node_modules/viem/_esm/clients/createWalletClient.js
function createWalletClient(parameters) {
  const { key = "wallet", name = "Wallet Client", transport } = parameters;
  const client = createClient({
    ...parameters,
    key,
    name,
    transport,
    type: "walletClient"
  });
  return client.extend(walletActions);
}

// ../../node_modules/viem/_esm/op-stack/contracts.js
var contracts = {
  gasPriceOracle: { address: "0x420000000000000000000000000000000000000F" },
  l1Block: { address: "0x4200000000000000000000000000000000000015" },
  l2CrossDomainMessenger: {
    address: "0x4200000000000000000000000000000000000007"
  },
  l2Erc721Bridge: { address: "0x4200000000000000000000000000000000000014" },
  l2StandardBridge: { address: "0x4200000000000000000000000000000000000010" },
  l2ToL1MessagePasser: {
    address: "0x4200000000000000000000000000000000000016"
  }
};

// ../../node_modules/viem/_esm/op-stack/formatters.js
var formatters = {
  block: /* @__PURE__ */ defineBlock({
    format(args) {
      const transactions = args.transactions?.map((transaction) => {
        if (typeof transaction === "string")
          return transaction;
        const formatted = formatTransaction(transaction);
        if (formatted.typeHex === "0x7e") {
          formatted.isSystemTx = transaction.isSystemTx;
          formatted.mint = transaction.mint ? hexToBigInt(transaction.mint) : void 0;
          formatted.sourceHash = transaction.sourceHash;
          formatted.type = "deposit";
        }
        return formatted;
      });
      return {
        transactions,
        stateRoot: args.stateRoot
      };
    }
  }),
  transaction: /* @__PURE__ */ defineTransaction({
    format(args) {
      const transaction = {};
      if (args.type === "0x7e") {
        transaction.isSystemTx = args.isSystemTx;
        transaction.mint = args.mint ? hexToBigInt(args.mint) : void 0;
        transaction.sourceHash = args.sourceHash;
        transaction.type = "deposit";
      }
      return transaction;
    }
  }),
  transactionReceipt: /* @__PURE__ */ defineTransactionReceipt({
    format(args) {
      return {
        l1GasPrice: args.l1GasPrice ? hexToBigInt(args.l1GasPrice) : null,
        l1GasUsed: args.l1GasUsed ? hexToBigInt(args.l1GasUsed) : null,
        l1Fee: args.l1Fee ? hexToBigInt(args.l1Fee) : null,
        l1FeeScalar: args.l1FeeScalar ? Number(args.l1FeeScalar) : null
      };
    }
  })
};

// ../../node_modules/viem/_esm/op-stack/serializers.js
function serializeTransaction2(transaction, signature) {
  if (isDeposit(transaction))
    return serializeTransactionDeposit(transaction);
  return serializeTransaction(transaction, signature);
}
var serializers = {
  transaction: serializeTransaction2
};
function serializeTransactionDeposit(transaction) {
  assertTransactionDeposit(transaction);
  const { sourceHash, data, from, gas, isSystemTx, mint, to, value } = transaction;
  const serializedTransaction = [
    sourceHash,
    from,
    to ?? "0x",
    mint ? toHex(mint) : "0x",
    value ? toHex(value) : "0x",
    gas ? toHex(gas) : "0x",
    isSystemTx ? "0x1" : "0x",
    data ?? "0x"
  ];
  return concatHex([
    "0x7e",
    toRlp(serializedTransaction)
  ]);
}
function isDeposit(transaction) {
  if (transaction.type === "deposit")
    return true;
  if (typeof transaction.sourceHash !== "undefined")
    return true;
  return false;
}
function assertTransactionDeposit(transaction) {
  const { from, to } = transaction;
  if (from && !isAddress(from))
    throw new InvalidAddressError({ address: from });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
}

// ../../node_modules/viem/_esm/op-stack/chainConfig.js
var chainConfig = {
  contracts,
  formatters,
  serializers
};

// ../../node_modules/viem/_esm/chains/definitions/mainnet.js
var mainnet = /* @__PURE__ */ defineChain({
  id: 1,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://cloudflare-eth.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://etherscan.io",
      apiUrl: "https://api.etherscan.io/api"
    }
  },
  contracts: {
    ensRegistry: {
      address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
    },
    ensUniversalResolver: {
      address: "0xce01f8eee7E479C928F8919abD53E553a36CeF67",
      blockCreated: 19258213
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 14353601
    }
  }
});

// ../../node_modules/viem/_esm/chains/definitions/sepolia.js
var sepolia = /* @__PURE__ */ defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://sepolia.drpc.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 751532
    },
    ensRegistry: { address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" },
    ensUniversalResolver: {
      address: "0xc8Af999e38273D658BE1b921b88A9Ddf005769cC",
      blockCreated: 5317080
    }
  },
  testnet: true
});

// src/chains/form.testnet.ts
var form_testnet_default = defineChain({
  ...chainConfig,
  id: 132902,
  name: "Form Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.form.network/http"] }
  },
  blockExplorers: {
    default: {
      name: "Form Testnet Explorer",
      url: "https://sepolia-explorer.form.network/"
    }
  },
  contracts: {
    addressManager: {
      [sepolia.id]: {
        address: "0xd5C38fa934f7fd7477D4800F4f38a1c5BFdF1373"
      }
    },
    l1CrossDomainMessenger: {
      [sepolia.id]: {
        address: "0x37A68565c4BE9700b3E3Ec60cC4416cAC3052FAa"
      }
    },
    l2OutputOracle: {
      [sepolia.id]: {
        address: "0x9eA2239E65a59EC9C7F1ED4C116dD58Da71Fc1e2"
      }
    },
    portal: {
      [sepolia.id]: {
        address: "0x60377e3cE15dF4CCA24c4beF076b60314240b032"
      }
    },
    l1StandardBridge: {
      [sepolia.id]: {
        address: "0xD4531f633942b2725896F47cD2aFd260b44Ab1F7"
      }
    }
  }
});

// src/chains/form.ts
var form_default = defineChain({
  ...chainConfig,
  id: 478,
  name: "Form",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.form.network/http"] }
  },
  blockExplorers: {
    default: {
      name: "Form Explorer",
      url: "https://explorer.form.network/"
    }
  },
  contracts: {
    addressManager: {
      [mainnet.id]: {
        address: "0x15c249E46A2F924C2dB3A1560CF86729bAD1f07B"
      }
    },
    l1CrossDomainMessenger: {
      [mainnet.id]: {
        address: "0xF333158DCCad1dF6C3F0a3aEe8BC31fA94d9eD5c"
      }
    },
    l2OutputOracle: {
      [mainnet.id]: {
        address: "0x4ccAAF69F41c5810cA875183648B577CaCf1F67E"
      }
    },
    portal: {
      [mainnet.id]: {
        address: "0x4E259Ee5F4136408908160dD32295A5031Fa426F"
      }
    },
    l1StandardBridge: {
      [mainnet.id]: {
        address: "0xdc20aA63D3DE59574E065957190D8f24e0F7B8Ba"
      }
    }
  }
});

// src/utils/addresses.ts
var CURVES_ADDRESSES = {
  [form_testnet_default.id]: {
    QUADRATIC: "0x3e4A86563f0a6688378a692e3D2a9651F4b704e9",
    LOGARITHMIC: "0xf2456EaD628da381f5c37e85B4B469B92B433fE8"
  },
  [form_default.id]: {
    QUADRATIC: "0xEad4138380B508949Ccd48B97AD930bd89aAb719",
    LOGARITHMIC: "0x88c7484d19E49B09233484824698a5214d81f866"
  }
};

// src/providers/curves.ts
var formulaGuideTemplate = `Formula Determination Guide:

LOGRITHMIC Formula (Required for Scale):
- Usage: Large-scale, high-volume, or stable-price scenarios
- Keywords that MUST trigger LOGRITHMIC:
  * "large groups", "mass market", "broad adoption"
  * "high volume", "heavy trading", "frequent trades"
  * "stable pricing", "price stability"
  * "expansive", "massive", "broad", "big"
  * Any mention of scale, size, or numerous participants
- Example contexts:
  * Community platforms expecting many participants
  * Trading venues with high transaction volumes
  * Scenarios requiring price stability
  * Large-scale social networks or communities

QUADRATIC Formula (Default Choice):
- Usage: Standard curves for regular use cases
- Appropriate for:
  * "small groups", "personal use", "intimate settings"
  * "exclusive", "niche", "specialized"
  * Individual users or small communities
  * When no specific scale is mentioned
- Example contexts:
  * Personal token collections
  * Small community groups
  * Individual creator tokens
  * Default when scale isn't specified

Decision Rules:
1. ANY mention of scale or volume \u2192 MUST use LOGRITHMIC
2. Explicit small-scale context \u2192 use QUADRATIC
3. No scale indicators \u2192 default to QUADRATIC

Example Mappings:
- "large community" \u2192 LOGRITHMIC
- "my personal token" \u2192 QUADRATIC
- "mass adoption" \u2192 LOGRITHMIC
- "friend group" \u2192 QUADRATIC
- "broad reach" \u2192 LOGRITHMIC`;
var curvesFormulaProvider = {
  get: async (runtime, _message, _state) => {
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const chain = isTestnet ? form_testnet_default : form_default;
    elizaLogger.debug(
      `[plugin-form][curves-formula-provider] getting formulas for chain ${chain.name}`
    );
    const formulas = Object.entries(CURVES_ADDRESSES[chain.id]).map(
      ([formula, address]) => `- ${formula}: ${address}
  Use case: ${formula === "LOGRITHMIC" ? "Large-scale/high-volume scenarios requiring price stability" : "Standard scenarios and personal/small group usage"}`
    ).join("\n");
    const output = `
!!! Available Curves Formulas on ${chain.name} !!!:
${formulas}

${formulaGuideTemplate}

Note: When no explicit formula is mentioned, analyze the context carefully using the guide above. The choice of formula significantly impacts price stability and trading behavior.
`;
    elizaLogger.debug(
      "[plugin-form][curves-formula-provider] output:",
      output
    );
    return output;
  }
};

// ../../node_modules/viem/_esm/accounts/index.js
import { HDKey } from "@scure/bip32";

// ../../node_modules/viem/_esm/accounts/privateKeyToAccount.js
import { secp256k1 as secp256k13 } from "@noble/curves/secp256k1";

// ../../node_modules/viem/_esm/accounts/toAccount.js
function toAccount(source) {
  if (typeof source === "string") {
    if (!isAddress(source, { strict: false }))
      throw new InvalidAddressError({ address: source });
    return {
      address: source,
      type: "json-rpc"
    };
  }
  if (!isAddress(source.address, { strict: false }))
    throw new InvalidAddressError({ address: source.address });
  return {
    address: source.address,
    nonceManager: source.nonceManager,
    sign: source.sign,
    experimental_signAuthorization: source.experimental_signAuthorization,
    signMessage: source.signMessage,
    signTransaction: source.signTransaction,
    signTypedData: source.signTypedData,
    source: "custom",
    type: "local"
  };
}

// ../../node_modules/viem/_esm/accounts/utils/sign.js
import { secp256k1 as secp256k12 } from "@noble/curves/secp256k1";
var extraEntropy = false;
async function sign({ hash, privateKey, to = "object" }) {
  const { r, s, recovery } = secp256k12.sign(hash.slice(2), privateKey.slice(2), { lowS: true, extraEntropy });
  const signature = {
    r: numberToHex(r, { size: 32 }),
    s: numberToHex(s, { size: 32 }),
    v: recovery ? 28n : 27n,
    yParity: recovery
  };
  return (() => {
    if (to === "bytes" || to === "hex")
      return serializeSignature({ ...signature, to });
    return signature;
  })();
}

// ../../node_modules/viem/_esm/accounts/utils/signAuthorization.js
async function experimental_signAuthorization(parameters) {
  const { contractAddress, chainId, nonce, privateKey, to = "object" } = parameters;
  const signature = await sign({
    hash: hashAuthorization({ contractAddress, chainId, nonce }),
    privateKey,
    to
  });
  if (to === "object")
    return {
      contractAddress,
      chainId,
      nonce,
      ...signature
    };
  return signature;
}

// ../../node_modules/viem/_esm/accounts/utils/signMessage.js
async function signMessage2({ message, privateKey }) {
  return await sign({ hash: hashMessage(message), privateKey, to: "hex" });
}

// ../../node_modules/viem/_esm/accounts/utils/signTransaction.js
async function signTransaction2(parameters) {
  const { privateKey, transaction, serializer = serializeTransaction } = parameters;
  const signableTransaction = (() => {
    if (transaction.type === "eip4844")
      return {
        ...transaction,
        sidecars: false
      };
    return transaction;
  })();
  const signature = await sign({
    hash: keccak256(serializer(signableTransaction)),
    privateKey
  });
  return serializer(transaction, signature);
}

// ../../node_modules/viem/_esm/accounts/utils/signTypedData.js
async function signTypedData2(parameters) {
  const { privateKey, ...typedData } = parameters;
  return await sign({
    hash: hashTypedData(typedData),
    privateKey,
    to: "hex"
  });
}

// ../../node_modules/viem/_esm/accounts/privateKeyToAccount.js
function privateKeyToAccount(privateKey, options = {}) {
  const { nonceManager } = options;
  const publicKey = toHex(secp256k13.getPublicKey(privateKey.slice(2), false));
  const address = publicKeyToAddress(publicKey);
  const account = toAccount({
    address,
    nonceManager,
    async sign({ hash }) {
      return sign({ hash, privateKey, to: "hex" });
    },
    async experimental_signAuthorization(authorization) {
      return experimental_signAuthorization({ ...authorization, privateKey });
    },
    async signMessage({ message }) {
      return signMessage2({ message, privateKey });
    },
    async signTransaction(transaction, { serializer } = {}) {
      return signTransaction2({ privateKey, transaction, serializer });
    },
    async signTypedData(typedData) {
      return signTypedData2({ ...typedData, privateKey });
    }
  });
  return {
    ...account,
    publicKey,
    source: "privateKey"
  };
}

// ../../node_modules/viem/_esm/utils/ens/normalize.js
import * as Ens from "ox/Ens";
function normalize2(name) {
  return Ens.normalize(name);
}

// src/providers/wallet.ts
import {
  elizaLogger as elizaLogger2
} from "@elizaos/core";
import NodeCache from "node-cache";
import * as path from "path";

// src/abi/curves.json
var curves_default = [
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesERC20Factory_",
        type: "address"
      },
      {
        internalType: "address",
        name: "feeRedistributor_",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "CannotSendFunds",
    type: "error"
  },
  {
    inputs: [],
    name: "ContractCannotReceiveTransfer",
    type: "error"
  },
  {
    inputs: [],
    name: "CurveAlreadyExists",
    type: "error"
  },
  {
    inputs: [],
    name: "ERC20TokenAlreadyMinted",
    type: "error"
  },
  {
    inputs: [],
    name: "ExceededMaxBuyAmount",
    type: "error"
  },
  {
    inputs: [],
    name: "InsufficientBalance",
    type: "error"
  },
  {
    inputs: [],
    name: "InsufficientPayment",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidERC20Metadata",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidFeeDefinition",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidPresaleStartTime",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidValue",
    type: "error"
  },
  {
    inputs: [],
    name: "LastTokenCannotBeSold",
    type: "error"
  },
  {
    inputs: [],
    name: "NonIntegerDepositAmount",
    type: "error"
  },
  {
    inputs: [],
    name: "PresaleUnavailable",
    type: "error"
  },
  {
    inputs: [],
    name: "SaleNotOpen",
    type: "error"
  },
  {
    inputs: [],
    name: "TokenAbsentForCurvesTokenSubject",
    type: "error"
  },
  {
    inputs: [],
    name: "Unauthorized",
    type: "error"
  },
  {
    inputs: [],
    name: "UnauthorizedCurvesTokenSubject",
    type: "error"
  },
  {
    inputs: [],
    name: "UnverifiedProof",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "erc20token",
        type: "address"
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        indexed: false,
        internalType: "string",
        name: "symbol",
        type: "string"
      }
    ],
    name: "TokenDeployed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "trader",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "subject",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isBuy",
        type: "bool"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "tokenAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "ethAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "protocolEthAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "subjectEthAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "supply",
        type: "uint256"
      }
    ],
    name: "Trade",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "presale",
        type: "address"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "root",
        type: "bytes32"
      }
    ],
    name: "WhitelistUpdated",
    type: "event"
  },
  {
    inputs: [],
    name: "DEFAULT_NAME",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "DEFAULT_SYMBOL",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "buyCurvesToken",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "startTime",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "merkleRoot",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "maxBuy",
        type: "uint256"
      }
    ],
    name: "buyCurvesTokenForPresale",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "bytes32[]",
        name: "proof",
        type: "bytes32[]"
      }
    ],
    name: "buyCurvesTokenWhitelisted",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "subjectToken",
        type: "address"
      }
    ],
    name: "claimFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "curvesERC20Factory",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "curvesTokenBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "curvesTokenSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "externalCurvesToSubject",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "externalCurvesTokens",
    outputs: [
      {
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string"
      },
      {
        internalType: "address",
        name: "token",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "feeRedistributor",
    outputs: [
      {
        internalType: "contract FeeSplitter",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "feesEconomics",
    outputs: [
      {
        internalType: "address",
        name: "protocolFeeDestination",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "protocolFeePercent",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "subjectFeePercent",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "referralFeePercent",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "holdersFeePercent",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "maxFeePercent",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "getBuyPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "getBuyPriceAfterFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "price",
        type: "uint256"
      }
    ],
    name: "getFees",
    outputs: [
      {
        internalType: "uint256",
        name: "protocolFee",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "subjectFee",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "referralFee",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "holdersFee",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "totalFee",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner_",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "index",
        type: "uint256"
      }
    ],
    name: "getOwnedCurvesTokenAt",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner_",
        type: "address"
      }
    ],
    name: "getOwnedCurvesTokenLength",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "supply",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "getPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "getSellPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "getSellPriceAfterFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "managers",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "presalesBuys",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "presalesMeta",
    outputs: [
      {
        internalType: "uint256",
        name: "presaleEndTime",
        type: "uint256"
      },
      {
        internalType: "bytes32",
        name: "merkleRoot",
        type: "bytes32"
      },
      {
        internalType: "uint256",
        name: "maxBuy",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "referralFeeDestination",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "sellCurvesToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "sellExternalCurvesToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "factory_",
        type: "address"
      }
    ],
    name: "setERC20Factory",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "subjectFeePercent_",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "referralFeePercent_",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "holdersFeePercent_",
        type: "uint256"
      }
    ],
    name: "setExternalFeePercent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "feeRedistributor_",
        type: "address"
      }
    ],
    name: "setFeeRedistributor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "manager_",
        type: "address"
      },
      {
        internalType: "bool",
        name: "value",
        type: "bool"
      }
    ],
    name: "setManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "maxFeePercent_",
        type: "uint256"
      }
    ],
    name: "setMaxFeePercent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string"
      },
      {
        internalType: "bool",
        name: "mintNow",
        type: "bool"
      }
    ],
    name: "setNameAndSymbol",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "protocolFeePercent_",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "protocolFeeDestination_",
        type: "address"
      }
    ],
    name: "setProtocolFeePercent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "referralFeeDestination_",
        type: "address"
      }
    ],
    name: "setReferralFeeDestination",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "merkleRoot",
        type: "bytes32"
      }
    ],
    name: "setWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    name: "symbolToSubject",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      }
    ],
    name: "transferAllCurvesTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "transferCurvesToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner_",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "address",
        name: "caller",
        type: "address"
      },
      {
        internalType: "bytes32[]",
        name: "proof",
        type: "bytes32[]"
      }
    ],
    name: "verifyMerkle",
    outputs: [],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvesTokenSubject",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// src/providers/wallet.ts
var curvesAbi = curves_default;
var FormWalletClient = class {
  constructor(accountOrPrivateKey, cacheManager, isTestnet = false) {
    this.cacheManager = cacheManager;
    this.cache = new NodeCache({ stdTTL: this.CACHE_EXPIRY_SEC });
    this.chain = isTestnet ? form_testnet_default : form_default;
    const account = privateKeyToAccount(accountOrPrivateKey);
    this.client = createWalletClient({
      account,
      chain: this.chain,
      transport: this.createHttpTransport()
    });
    this.curves = {
      addresses: CURVES_ADDRESSES[this.chain.id],
      abi: curvesAbi
    };
  }
  cache;
  cacheKey = "form/wallet";
  chain;
  CACHE_EXPIRY_SEC = 60;
  client;
  curves;
  getCurvesAddress(formula) {
    const chainId = this.getChain().id;
    return CURVES_ADDRESSES[chainId][formula];
  }
  createHttpTransport() {
    if (this.chain.rpcUrls.custom) {
      return http(this.chain.rpcUrls.custom.http[0]);
    }
    return http(this.chain.rpcUrls.default.http[0]);
  }
  async resolveAddress(address) {
    if (isAddress(address, { strict: false })) return address;
    try {
      const resolvedAddress = await this.getPublicClient().getEnsAddress(
        {
          name: normalize2(address)
        }
      );
      if (!resolvedAddress) {
        throw new Error(
          "[plugin-form] ENS name could not be resolved."
        );
      }
      return resolvedAddress;
    } catch (error) {
      throw new Error(
        `[plugin-form] failed to resolve ENS name [${address}]: ${error}`
      );
    }
  }
  // Cache helpers
  async readFromCache(key) {
    return await this.cacheManager.get(path.join(this.cacheKey, key));
  }
  async writeToCache(key, data) {
    await this.cacheManager.set(path.join(this.cacheKey, key), data, {
      expires: Date.now() + this.CACHE_EXPIRY_SEC * 1e3
    });
  }
  async getCachedData(key) {
    const cachedData = this.cache.get(key);
    if (cachedData) {
      return cachedData;
    }
    const fileCachedData = await this.readFromCache(key);
    if (fileCachedData) {
      this.cache.set(key, fileCachedData);
      return fileCachedData;
    }
    return null;
  }
  async invalidateData(key) {
    this.cache.del(key);
    await this.cacheManager.delete(key);
  }
  async setCachedData(cacheKey2, data) {
    this.cache.set(cacheKey2, data);
    await this.writeToCache(cacheKey2, data);
  }
  getAccount() {
    return this.client.account;
  }
  getAddress() {
    return this.client.account?.address;
  }
  getChain() {
    return this.chain;
  }
  getPublicClient() {
    const transport = this.createHttpTransport();
    const publicClient = createPublicClient({
      chain: this.chain,
      transport
    });
    return publicClient;
  }
  getWalletClient() {
    return this.client;
  }
  async getWalletBalance() {
    const cacheKey2 = `${this.chain.id}_wallet_balance_${this.getAddress()}`;
    const cachedData = await this.getCachedData(cacheKey2);
    if (cachedData) {
      elizaLogger2.log(
        "[plugin-form] returning cached wallet balance for chain: " + this.chain.name
      );
      return cachedData;
    }
    try {
      const balance = await this.getPublicClient().getBalance({
        address: this.getAddress()
      });
      const balanceFormatted = formatUnits(balance, 18);
      this.setCachedData(cacheKey2, balanceFormatted);
      elizaLogger2.log(
        "[plugin-form] wallet balance cached for chain: ",
        this.chain
      );
      return balanceFormatted;
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }
  async read(request) {
    const { address, abi: abi2, functionName, args } = request;
    if (!abi2)
      throw new Error(
        "[plugin-form] cannot execute read transaction without abi"
      );
    const result = await this.getPublicClient().readContract({
      address: await this.resolveAddress(address),
      abi: abi2,
      functionName,
      args
    });
    return result;
  }
  async sendTransaction(transaction) {
    const { to, abi: abi2, functionName, args, value, options, data } = transaction;
    if (!this.getWalletClient().account)
      throw new Error("[plugin-form] no account connected");
    if (abi2 && !functionName) {
      throw new Error(
        "[plugin-form] function name is required for contract calls"
      );
    }
    const toAddress = await this.resolveAddress(to);
    if (!abi2) {
      const txParams = {
        to: toAddress,
        value,
        data,
        account: this.getWalletClient().account,
        chain: this.chain,
        // Add gas options if provided
        ...options?.gasLimit && { gas: options.gasLimit },
        kzg: {}
      };
      const txHash2 = await this.getWalletClient().sendTransaction(txParams);
      return this.waitForReceipt(txHash2);
    }
    const { request } = await this.getPublicClient().simulateContract({
      account: this.getWalletClient().account,
      address: toAddress,
      abi: abi2,
      functionName,
      args,
      chain: this.chain,
      value,
      // Add gas options if provided
      ...options?.gasLimit && { gas: options.gasLimit }
    });
    const txHash = await this.getWalletClient().writeContract(request);
    return this.waitForReceipt(txHash);
  }
  async signMessage(message) {
    if (!this.getWalletClient().account) {
      throw new Error("[plugin-form] no account connected");
    }
    try {
      const signature = await this.getWalletClient().signMessage({
        message: typeof message === "string" ? message : message.raw,
        account: this.getWalletClient().account
      });
      return { signature };
    } catch (error) {
      throw new Error(`[plugin-form] failed to sign message: ${error}`);
    }
  }
  async waitForReceipt(txHash) {
    return await this.getPublicClient().waitForTransactionReceipt({
      hash: txHash
    });
  }
  async buyCurvesToken(curves, subject, amount = 1) {
    try {
      elizaLogger2.info(
        `[plugin-form] initiating buy [curves: ${curves} | amount: ${amount}]`
      );
      const buyPrice = await this.getCurvesBuyPrice(
        curves,
        subject,
        amount
      );
      const tx = await this.sendTransaction({
        to: curves,
        abi: this.curves.abi,
        functionName: "buyCurvesToken",
        args: [subject, amount],
        value: buyPrice
      });
      elizaLogger2.info(
        `[plugin-form] buy successful [tx: ${tx.transactionHash}]`
      );
      const balanceCacheKey = this.getCurvesBalanceCacheKey(
        curves,
        this.getAddress(),
        subject
      );
      this.invalidateData(balanceCacheKey);
      return tx;
    } catch (error) {
      elizaLogger2.error(`[plugin-form] buy failed:`, error);
      throw error;
    }
  }
  async sellCurvesToken(curves, subject, amount = 1) {
    try {
      const result = await this.sendTransaction({
        to: curves,
        abi: this.curves.abi,
        functionName: "sellCurvesToken",
        args: [subject, amount]
      });
      const balanceCacheKey = this.getCurvesBalanceCacheKey(
        curves,
        this.getAddress(),
        subject
      );
      this.invalidateData(balanceCacheKey);
      return result;
    } catch (error) {
      throw new Error(
        `[plugin-form] failed to sell curves token: ${error}`
      );
    }
  }
  async withdrawCurves(curves, subject, amount = 1) {
    try {
      const result = await this.sendTransaction({
        to: curves,
        abi: this.curves.abi,
        functionName: "withdraw",
        args: [subject, amount]
      });
      const balanceCacheKey = this.getCurvesBalanceCacheKey(
        curves,
        this.getAddress(),
        subject
      );
      this.invalidateData(balanceCacheKey);
      return result;
    } catch (error) {
      throw new Error(`[plugin-form] failed to withdraw: ${error}`);
    }
  }
  async depositCurves(curves, subject, amount = BigInt("1000000000000000000")) {
    try {
      const result = await this.sendTransaction({
        to: curves,
        abi: this.curves.abi,
        functionName: "deposit",
        args: [subject, amount]
      });
      const balanceCacheKey = this.getCurvesBalanceCacheKey(
        curves,
        this.getAddress(),
        subject
      );
      this.invalidateData(balanceCacheKey);
      return result;
    } catch (error) {
      throw new Error(`[plugin-form] failed to deposit: ${error}`);
    }
  }
  async mintCurvesERC20Token(curves, name, symbol) {
    try {
      return await this.sendTransaction({
        to: curves,
        abi: this.curves.abi,
        functionName: "setNameAndSymbol",
        // setNameAndSymbol with 'mintNow = true'
        args: [name, symbol, true]
      });
    } catch (error) {
      throw new Error(
        `[plugin-form] failed to set ERC20 metadata: ${error}`
      );
    }
  }
  async getCurvesERC20TokenDetails(curves, subject) {
    try {
      const cacheKey2 = `${this.chain.id}_curves_erc20_${curves}_${subject}`;
      const cachedToken = await this.getCachedData(cacheKey2);
      if (cachedToken) {
        elizaLogger2.log(
          `[plugin-form] returning cached curves ERC20 token details [chain: ${this.chain.name} | curves: ${curves} | address: ${subject}]`
        );
        return JSON.parse(cachedToken);
      }
      const address = subject || this.getAddress();
      const result = await this.read({
        address: curves,
        abi: this.curves.abi,
        functionName: "externalCurvesTokens",
        args: [address]
      });
      const erc20 = {
        name: result[0],
        symbol: result[1],
        decimals: 18,
        address: result[2]
      };
      this.setCachedData(cacheKey2, JSON.stringify(erc20));
      elizaLogger2.log(
        `[plugin-form] curves ERC20 token details cached for [chain: ${this.chain.name} | curves: ${curves} | address: ${subject}]`
      );
      return erc20;
    } catch (error) {
      throw new Error(`[plugin-form] failed to get ERC20 info: ${error}`);
    }
  }
  getCurvesBalanceCacheKey(curves, owner, subject) {
    return `${this.chain.id}_curves_balance_${curves}_${owner}_${subject}`;
  }
  async getCurvesTokenBalance(curves, owner, subject) {
    try {
      const cacheKey2 = this.getCurvesBalanceCacheKey(
        curves,
        owner,
        subject
      );
      const cachedBalance = await this.getCachedData(cacheKey2);
      if (cachedBalance) {
        elizaLogger2.debug(
          `[plugin-form] using cached balance [chain: ${this.chain.id} | curves: ${curves} | subject: ${subject}]`
        );
        return BigInt(cachedBalance);
      }
      const result = await this.read({
        address: curves,
        abi: this.curves.abi,
        functionName: "curvesTokenBalance",
        args: [subject, owner]
      });
      let balance;
      if (typeof result === "bigint") {
        balance = result;
      } else if (typeof result === "string" || typeof result === "number") {
        balance = BigInt(result);
      }
      await this.setCachedData(cacheKey2, balance.toString());
      elizaLogger2.info(
        `[plugin-form] balance: ${balance.toString()} [curves: ${curves.slice(0, 6)}...${curves.slice(-4)}]`
      );
      return balance;
    } catch (error) {
      throw new Error(
        `[plugin-form] failed to get curves balance: ${error}`
      );
    }
  }
  async getCurvesBuyPrice(curves, subject, amount = 1) {
    try {
      const cacheKey2 = `${this.chain.id}_curves_buy_price_${curves}_${subject}_${amount}`;
      const cachedPrice = await this.getCachedData(cacheKey2);
      if (cachedPrice) {
        elizaLogger2.debug(
          `[plugin-form] using cached buy price [chain: ${this.chain.id} | amount: ${amount}]`
        );
        return BigInt(cachedPrice);
      }
      const result = await this.read({
        address: curves,
        abi: this.curves.abi,
        functionName: "getBuyPrice",
        args: [subject, amount]
      });
      let price;
      if (typeof result === "bigint") {
        price = result;
      } else if (typeof result === "string" || typeof result === "number") {
        price = BigInt(result);
      }
      await this.setCachedData(cacheKey2, price.toString());
      elizaLogger2.info(
        `[plugin-form] buy price: ${formatUnits(price, 18)} ETH [amount: ${amount}]`
      );
      return price;
    } catch (error) {
      throw new Error(`[plugin-form] failed to get buy price: ${error}`);
    }
  }
  async getCurvesSellPrice(curves, subject, amount = 1) {
    try {
      const cacheKey2 = `${this.chain.id}_curves_sell_price_${curves}_${subject}_${amount}`;
      const cachedPrice = await this.getCachedData(cacheKey2);
      if (cachedPrice) {
        elizaLogger2.debug(
          `[plugin-form] using cached sell price [chain: ${this.chain.id} | amount: ${amount}]`
        );
        return BigInt(cachedPrice);
      }
      const result = await this.read({
        address: curves,
        abi: this.curves.abi,
        functionName: "getSellPrice",
        args: [subject, amount]
      });
      let price;
      if (typeof result === "bigint") {
        price = result;
      } else if (typeof result === "string" || typeof result === "number") {
        price = BigInt(result);
      }
      await this.setCachedData(cacheKey2, price.toString());
      elizaLogger2.info(
        `[plugin-form] sell price: ${formatUnits(price, 18)} ETH [amount: ${amount}]`
      );
      return price;
    } catch (error) {
      elizaLogger2.error(
        `[plugin-form] failed to get sell price for ${subject}:`,
        error
      );
      throw error;
    }
  }
};
var formWalletProvider = {
  async get(runtime, _message, state) {
    try {
      const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
      const privateKey = runtime.getSetting(
        "FORM_PRIVATE_KEY"
      );
      if (!privateKey) {
        throw new Error("FORM_PRIVATE_KEY is missing");
      }
      const wallet = new FormWalletClient(
        privateKey,
        runtime.cacheManager,
        isTestnet
      );
      const address = wallet.getAddress();
      const chain = wallet.getChain();
      const agentName = state?.agentName || runtime.character.name || "The agent";
      return `${agentName}'s Form Wallet Address: ${address}
Chain: ${chain.name}`;
    } catch (error) {
      elizaLogger2.error(
        "[plugin-form] Error in Form wallet provider:",
        error
      );
      return null;
    }
  }
};

// src/actions/buyCurves.ts
import {
  composeContext,
  elizaLogger as elizaLogger3,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";
var BuyCurvesTokenAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async buy(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger3.debug(
      `[plugin-form][buy-curves-token] buying ${params.amount} curves tokens for subject ${params.subject} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const buyPrice = await this.wallet.getCurvesBuyPrice(
      curvesAddress,
      subjectAddress,
      params.amount
    );
    const tx = await this.wallet.buyCurvesToken(
      curvesAddress,
      subjectAddress,
      params.amount
    );
    return {
      hash: tx.transactionHash,
      price: buyPrice,
      subject: subjectAddress,
      amount: params.amount,
      formula,
      curvesAddress
    };
  }
};
var buildBuyCurvesDetails = async (state, runtime) => {
  const context = composeContext({
    state,
    template: buyCurvesTemplate
  });
  const buyDetails = await generateObjectDeprecated({
    runtime,
    context,
    modelClass: ModelClass.SMALL
  });
  if (!buyDetails.formula) {
    buyDetails.formula = "QUADRATIC";
  }
  return buyDetails;
};
var buyCurvesTokenAction = {
  name: "buy_curves_token",
  description: "Buy curves tokens for a subject address using specified formula",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger3.debug(
      "[plugin-form][buy-curves-token] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new BuyCurvesTokenAction(wallet);
    try {
      const buyParams = await buildBuyCurvesDetails(currentState, runtime);
      const buyResp = await action.buy(buyParams);
      if (callback) {
        callback({
          text: `Successfully bought ${buyParams.amount} curves tokens for ${buyParams.subject} using ${buyResp.formula} formula
Transaction Hash: ${buyResp.hash}
Price paid: ${formatEther(buyResp.price)} ETH`,
          content: {
            success: true,
            hash: buyResp.hash,
            amount: buyResp.amount,
            subject: buyResp.subject,
            price: formatEther(buyResp.price),
            formula: buyResp.formula,
            curvesAddress: buyResp.curvesAddress
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger3.error(
        "[plugin-form][buy-curves-token] error during curves token purchase:",
        error
      );
      if (callback) {
        callback({
          text: `Error buying curves tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you buy 1 curves token using QUADRATIC formula for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "BUY_CURVES"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Buy a curves token for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "BUY_CURVES"
        }
      }
    ]
  ],
  similes: ["BUY_CURVES", "PURCHASE_CURVES", "GET_CURVES"]
};
var buyCurvesTemplate = `You are an AI assistant specialized in processing Form chain curves token purchase requests. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the curves token purchase:
1. Subject address (must be a valid Ethereum address)
2. Amount of curve tokens to buy (default to 1 if not specified and must be an integer)
3. Formula type (must be be one of the available formulas or QUADRATIC if not specified)

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information:
 - Quote the part mentioning the subject address.
 - Quote the part mentioning the amount (if any).
 - Quote the part mentioning the formula type (if any).

2. Validate each piece:
 Subject Address:
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Verify it follows hexadecimal format (0-9, a-f)

 Amount:
 - Must be a positive integer number
 - If not specified, use 1 as default
 - Cannot be zero

 Formula:
 - Must be one of the "Available Curves Formulas"
 - If not specified, use "QUADRATIC" as default
 - Verify case sensitivity matches exactly

3. Error Checking:
 - Flag any invalid address format
 - Flag any negative or zero amounts
 - Flag any unrecognized formula types

4. If all information is valid, summarize:
 - Confirmed subject address
 - Final amount (specified or default)
 - Selected formula (specified or default)

After your analysis, provide the final output in a JSON markdown block with this exact structure:
\`\`\`json
{
  "subject": string,    // The validated Ethereum address
  "amount": number,     // The number of curves tokens to buy
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- The subject field must be a valid Ethereum address starting with "0x" (42 characters)
- The amount field must be a positive number (defaults to 1)
- The formula field must be exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 1,
  "formula": "QUADRATIC"
}
\`\`\`

\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 5,
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, process the user's request and provide your response.`;

// src/actions/sellCurves.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger4,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2
} from "@elizaos/core";
var SellCurvesTokenAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async sell(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger4.debug(
      `[plugin-form][sell-curves-token] selling ${params.amount} curves tokens for subject ${params.subject} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const sellPrice = await this.wallet.getCurvesSellPrice(
      curvesAddress,
      subjectAddress,
      params.amount
    );
    const tx = await this.wallet.sellCurvesToken(
      curvesAddress,
      subjectAddress,
      params.amount
    );
    return {
      hash: tx.transactionHash,
      price: sellPrice,
      subject: subjectAddress,
      amount: params.amount,
      formula,
      curvesAddress
    };
  }
};
var buildSellCurvesDetails = async (state, runtime) => {
  const context = composeContext2({
    state,
    template: sellCurvesTemplate
  });
  const sellDetails = await generateObjectDeprecated2({
    runtime,
    context,
    modelClass: ModelClass2.SMALL
  });
  if (!sellDetails.formula) {
    sellDetails.formula = "QUADRATIC";
  }
  return sellDetails;
};
var sellCurvesTokenAction = {
  name: "sell_curves_token",
  description: "Sell curves tokens for a subject address using specified formula",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger4.debug(
      "[plugin-form][sell-curves-token] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new SellCurvesTokenAction(wallet);
    try {
      const sellParams = await buildSellCurvesDetails(currentState, runtime);
      const sellResp = await action.sell(sellParams);
      if (callback) {
        callback({
          text: `Successfully sold ${sellParams.amount} curves tokens for ${sellParams.subject} using ${sellResp.formula} formula
Transaction Hash: ${sellResp.hash}
Sale price: ${formatEther(sellResp.price)} ETH`,
          content: {
            success: true,
            hash: sellResp.hash,
            amount: sellResp.amount,
            subject: sellResp.subject,
            price: formatEther(sellResp.price),
            formula: sellResp.formula,
            curvesAddress: sellResp.curvesAddress
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger4.error(
        "[plugin-form][sell-curves-token] error during curves token sale:",
        error
      );
      if (callback) {
        callback({
          text: `Error selling curves tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you sell 2 curves token using QUADRATIC formula for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "SELL_CURVES"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Sell 2 curves token for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "SELL_CURVES"
        }
      }
    ]
  ],
  similes: ["SELL_CURVES", "DISPOSE_CURVES", "EXIT_CURVES"]
};
var sellCurvesTemplate = `You are an AI assistant specialized in processing Form chain curves token sell requests. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the curves token sale:
1. Subject address (must be a valid Ethereum address)
2. Amount of curve tokens to sell (default to 1 if not specified and must be an integer)
3. Formula type (must be be one of the available formulas or QUADRATIC if not specified)

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information:
 - Quote the part mentioning the subject address (the address whose curves you're selling).
 - Quote the part mentioning the amount (if any).
 - Quote the part mentioning the formula type (if any).

2. Validate each piece:
 Subject Address:
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Verify it follows hexadecimal format (0-9, a-f)

 Amount:
 - Must be a positive integer number
 - If not specified, use 1 as default
 - Cannot be zero or negative
 - Must not exceed user's balance (if mentioned in conversation)

 Formula:
 - Must be one of the "Available Curves Formulas"
 - If not specified, use "QUADRATIC" as default
 - Verify case sensitivity matches exactly

3. Error Checking:
 - Flag any invalid address format
 - Flag any negative, zero, or non-integer amounts
 - Flag any unrecognized formula types
 - Flag if attempting to sell more than available balance (if balance is mentioned)

4. If all information is valid, summarize:
 - Confirmed subject address being sold
 - Final amount to sell (specified or default)
 - Selected formula (specified or default)

After your analysis, provide the final output in a JSON markdown block with this exact structure:
\`\`\`json
{
  "subject": string,    // The validated Ethereum address
  "amount": number,     // The number of curves tokens to sell
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- The subject field must be a valid Ethereum address starting with "0x" (42 characters)
- The amount field must be a positive integer (defaults to 1)
- The formula field must be exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 1,
  "formula": "QUADRATIC"
}
\`\`\`

\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 3,
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, process the user's sell request and provide your response.`;

// src/actions/withdrawCurves.ts
import {
  composeContext as composeContext3,
  elizaLogger as elizaLogger5,
  generateObjectDeprecated as generateObjectDeprecated3,
  ModelClass as ModelClass3
} from "@elizaos/core";
var WithdrawCurvesTokenAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async withdraw(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger5.debug(
      `[plugin-form][withdraw-curves-token] withdrawing ${params.amount} curves tokens for subject ${params.subject} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const tx = await this.wallet.withdrawCurves(
      curvesAddress,
      subjectAddress,
      params.amount
    );
    const erc20Info = await this.wallet.getCurvesERC20TokenDetails(
      curvesAddress,
      subjectAddress
    );
    return {
      hash: tx.transactionHash,
      subject: subjectAddress,
      amount: params.amount,
      formula,
      curvesAddress,
      erc20Token: erc20Info
    };
  }
};
var withdrawCurvesTokenAction = {
  name: "withdraw_curves_token",
  description: "Convert Curves tokens to their ERC20 equivalent token",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger5.debug(
      "[plugin-form][withdraw-curves-token] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new WithdrawCurvesTokenAction(wallet);
    try {
      const withdrawParams = await generateObjectDeprecated3({
        runtime,
        context: composeContext3({
          state: currentState,
          template: withdrawCurvesTemplate
        }),
        modelClass: ModelClass3.SMALL
      });
      withdrawParams.formula = withdrawParams.formula ?? "QUADRATIC";
      const withdrawResp = await action.withdraw(withdrawParams);
      if (callback) {
        callback({
          text: `Successfully withdrew ${withdrawParams.amount} curves tokens to ERC20 ${withdrawResp.erc20Token.symbol}
Transaction Hash: ${withdrawResp.hash}
ERC20 Token Address: ${withdrawResp.erc20Token.address}`,
          content: {
            success: true,
            hash: withdrawResp.hash,
            amount: withdrawResp.amount,
            subject: withdrawResp.subject,
            formula: withdrawResp.formula,
            curvesAddress: withdrawResp.curvesAddress,
            erc20Token: withdrawResp.erc20Token
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger5.error(
        "[plugin-form][withdraw-curves-token] error during withdrawal:",
        error
      );
      if (callback) {
        callback({
          text: `Error withdrawing curves tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you withdraw 1 curves token to ERC20 for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "WITHDRAW_CURVES"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Convert my curves token for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e to ERC20",
          action: "WITHDRAW_CURVES"
        }
      }
    ]
  ],
  similes: [
    "WITHDRAW_CURVES",
    "CONVERT_CURVES_TO_ERC20",
    "GET_ERC20_FROM_CURVES"
  ]
};
var withdrawCurvesTemplate = `You are an AI assistant specialized in processing Form chain curves token withdrawals to ERC20. Your task is to extract information and determine the appropriate formula from the conversation context.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract:
1. Subject address (whose curves you're converting to ERC20)
2. Amount of curves tokens to withdraw (must be an integer and default to 1 if not specified)
3. Determine the formula type based on context

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify and Quote Information:
 - Quote mentions of the subject address
 - Quote mentions of withdrawal amount
 - Quote any references to formula type or trading patterns

2. Subject Address Validation:
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Must follow hexadecimal format (0-9, a-f)

3. Amount Validation:
 - Must be a positive integer
 - Default to 1 if not specified
 - Cannot be zero
 - Must not exceed available curves balance (if mentioned)

4. Formula Determination:
 If formula is explicitly mentioned:
 - QUADRATIC: Standard bonding curve
 - LOGARITHMIC: For high volume or stability focus

 If no formula mentioned, analyze:
 - Look for keywords suggesting high volume/stability needs
 - Consider mentioned use cases or patterns
 - Default to QUADRATIC if context is unclear

5. Error Checking:
 - Invalid address format
 - Non-integer or invalid amounts
 - Unsupported formula types
 - Balance exceeded (if known)

6. Final Summary:
 - Verified subject address
 - Confirmed withdrawal amount
 - Selected formula with reasoning

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
  "subject": string,    // Validated Ethereum address
  "amount": number,     // Integer amount to withdraw
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- Subject: valid Ethereum address (0x... format, 42 chars)
- Amount: positive integer (defaults to 1)
- Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 1,
  "formula": "QUADRATIC"
}
\`\`\`

\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 5,
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the withdrawal request and provide your response.`;

// src/actions/depositCurves.ts
import {
  composeContext as composeContext4,
  elizaLogger as elizaLogger6,
  generateObjectDeprecated as generateObjectDeprecated4,
  ModelClass as ModelClass4
} from "@elizaos/core";
var DepositCurvesTokenAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async deposit(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger6.debug(
      `[plugin-form][deposit-curves-token] depositing ERC20 equivalent of ${params.amount} curves tokens for subject ${params.subject} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const depositAmount = parseUnits(params.amount.toString(), 18);
    const tx = await this.wallet.depositCurves(
      curvesAddress,
      subjectAddress,
      depositAmount
    );
    const erc20Info = await this.wallet.getCurvesERC20TokenDetails(
      curvesAddress,
      subjectAddress
    );
    return {
      hash: tx.transactionHash,
      subject: subjectAddress,
      amount: params.amount,
      depositAmount,
      formula,
      curvesAddress,
      erc20Token: erc20Info
    };
  }
};
var depositCurvesTokenAction = {
  name: "deposit_curves_token",
  description: "Convert ERC20 tokens to their Curves equivalent",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger6.debug(
      "[plugin-form][deposit-curves-token] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new DepositCurvesTokenAction(wallet);
    try {
      const depositParams = await generateObjectDeprecated4({
        runtime,
        context: composeContext4({
          state: currentState,
          template: depositCurvesTemplate
        }),
        modelClass: ModelClass4.SMALL
      });
      depositParams.formula = depositParams.formula ?? "QUADRATIC";
      const depositResp = await action.deposit(depositParams);
      if (callback) {
        callback({
          text: `Successfully deposited ${formatUnits(depositResp.depositAmount, 18)} ${depositResp.erc20Token.symbol} to receive ${depositParams.amount} curves tokens
Transaction Hash: ${depositResp.hash}`,
          content: {
            success: true,
            hash: depositResp.hash,
            amount: depositResp.amount,
            depositAmount: depositResp.depositAmount.toString(),
            subject: depositResp.subject,
            formula: depositResp.formula,
            curvesAddress: depositResp.curvesAddress,
            erc20Token: depositResp.erc20Token
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger6.error(
        "[plugin-form][deposit-curves-token] error during deposit:",
        error
      );
      if (callback) {
        callback({
          text: `Error depositing ERC20 tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you deposit ERC20 tokens to get 1 curves token for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "DEPOSIT_CURVES"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Convert my ERC20 tokens for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e to Curves",
          action: "DEPOSIT_CURVES"
        }
      }
    ]
  ],
  similes: [
    "DEPOSIT_CURVES",
    "CONVERT_ERC20_TO_CURVES",
    "GET_CURVES_FROM_ERC20"
  ]
};
var depositCurvesTemplate = `You are an AI assistant specialized in processing Form chain ERC20 token deposits to Curves. Your task is to extract information and determine the appropriate formula from the conversation context.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract:
1. Subject address (whose ERC20 tokens you're converting to Curves)
2. Amount of Curves tokens to receive (will be automatically converted to 18 decimals)
3. Determine the formula type based on context

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify and Quote Information:
 - Quote mentions of the subject address
 - Quote mentions of deposit amount
 - Quote any references to formula type or trading patterns

2. Subject Address Validation:
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Must follow hexadecimal format (0-9, a-f)

3. Amount Validation:
 - Must be a positive number
 - Default to 1 if not specified
 - Cannot be zero
 - Convert cleanly to 18 decimal precision
 - Must not exceed available ERC20 balance (if mentioned)

4. Formula Determination:
 If formula is explicitly mentioned:
 - QUADRATIC: Standard bonding curve
 - LOGARITHMIC: For high volume or stability focus

 If no formula mentioned, analyze:
 - Look for keywords suggesting high volume/stability needs
 - Consider mentioned use cases or patterns
 - Default to QUADRATIC if context is unclear

5. Error Checking:
 - Invalid address format
 - Invalid amounts
 - Unsupported formula types
 - Balance exceeded (if known)

6. Final Summary:
 - Verified subject address
 - Confirmed deposit amount (in standard units)
 - Selected formula with reasoning

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
  "subject": string,    // Validated Ethereum address
  "amount": number,     // Amount in standard units (will be converted to 18 decimals)
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- Subject: valid Ethereum address (0x... format, 42 chars)
- Amount: positive number (defaults to 1)
- Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 1,
  "formula": "QUADRATIC"
}
\`\`\`

\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 2.5,
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the deposit request and provide your response.`;

// src/actions/getCurvesBuyPrice.ts
import {
  composeContext as composeContext5,
  elizaLogger as elizaLogger7,
  generateObjectDeprecated as generateObjectDeprecated5,
  ModelClass as ModelClass5
} from "@elizaos/core";
var GetCurvesBuyPriceAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async getPrice(params) {
    const formula = params.formula || "QUADRATIC";
    const amount = params.amount || 1;
    elizaLogger7.debug(
      `[plugin-form][get-curves-price] checking buy price for ${amount} curves of subject ${params.subject} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const price = await this.wallet.getCurvesBuyPrice(
      curvesAddress,
      subjectAddress,
      amount
    );
    return {
      subject: subjectAddress,
      amount,
      price,
      formula,
      curvesAddress
    };
  }
};
var getCurvesBuyPriceAction = {
  name: "get_curves_buy_price",
  description: "Check buy price for Curves tokens",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger7.debug(
      "[plugin-form][get-curves-price] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new GetCurvesBuyPriceAction(wallet);
    try {
      const params = await generateObjectDeprecated5({
        runtime,
        context: composeContext5({
          state: currentState,
          template: getCurvesBuyPriceTemplate
        }),
        modelClass: ModelClass5.SMALL
      });
      params.formula = params.formula ?? "QUADRATIC";
      params.amount = params.amount ?? 1;
      const priceResp = await action.getPrice(params);
      if (callback) {
        callback({
          text: `Buy Price Quote:
 Subject: ${priceResp.subject}
 Amount: ${priceResp.amount} curves
 Price: ${formatEther(priceResp.price)} ETH
 Formula: ${priceResp.formula}`,
          content: {
            success: true,
            subject: priceResp.subject,
            amount: priceResp.amount,
            price: priceResp.price.toString(),
            priceFormatted: formatEther(priceResp.price),
            formula: priceResp.formula,
            curvesAddress: priceResp.curvesAddress
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger7.error(
        "[plugin-form][get-curves-price] error getting price:",
        error
      );
      if (callback) {
        callback({
          text: `Error getting curves buy price: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you check the price for buying 1 curves token of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "GET_CURVES_PRICE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "How much to buy curves for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e?",
          action: "GET_CURVES_PRICE"
        }
      }
    ]
  ],
  similes: [
    "GET_CURVES_PRICE",
    "CHECK_BUY_PRICE",
    "QUOTE_CURVES_PRICE",
    "SIMULATE_CURVES_BUY"
  ]
};
var getCurvesBuyPriceTemplate = `You are an AI assistant specialized in checking Form chain curves token buy prices. Your task is to extract the price check parameters from the conversation context.

 First, review the recent messages from the conversation:
 <recent_messages>
 {{recentMessages}}
 </recent_messages>

 Your goal is to extract:
 1. Subject address (whose curves to check price for)
 2. Amount to simulate buying (defaults to 1 if not specified)
 3. Determine the formula type based on context

 Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

 1. Identify and Quote Information:
 - Quote mentions of the subject address
 - Quote mentions of the amount to buy
 - Quote any references to formula type or market patterns

 2. Address Validation:
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Must follow hexadecimal format (0-9, a-f)

 3. Amount Validation:
 - Must be a positive number
 - If not specified, use 1 as default
 - Cannot be zero
 - Can be a decimal (e.g., 0.5, 2.5)

 4. Formula Determination:
 If formula is explicitly mentioned:
 - QUADRATIC: Standard bonding curve
 - LOGARITHMIC: For high volume or stability focus

 If no formula mentioned, analyze:
 - Look for keywords suggesting high volume/stability needs
 - Consider mentioned market patterns
 - Default to QUADRATIC if context is unclear

 5. Context Analysis:
 - Is this for market making?
 - Is this a price check before buying?
 - Are we comparing different amounts?

 6. Final Summary:
 - Confirmed subject address
 - Validated amount to simulate
 - Selected formula with reasoning

 After your analysis, provide the final output in a JSON markdown block:
 \`\`\`json
 {
  "subject": string,    // Validated Ethereum address
  "amount": number,     // Positive number of tokens to simulate buying
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
 }
 \`\`\`

 Requirements:
 - Subject: valid Ethereum address (0x... format, 42 chars)
 - Amount: positive number (defaults to 1)
 - Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

 Example valid outputs:

 Checking price for 1 token:
 \`\`\`json
 {
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 1,
  "formula": "QUADRATIC"
 }
 \`\`\`

 Checking price for multiple tokens:
 \`\`\`json
 {
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 2.5,
  "formula": "LOGARITHMIC"
 }
 \`\`\`

 {{providers}}

 Now, analyze the price check request and provide your response.`;

// src/actions/getCurvesSellPrice.ts
import {
  composeContext as composeContext6,
  elizaLogger as elizaLogger8,
  generateObjectDeprecated as generateObjectDeprecated6,
  ModelClass as ModelClass6
} from "@elizaos/core";
var GetCurvesSellPriceAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async getPrice(params) {
    const formula = params.formula || "QUADRATIC";
    const amount = params.amount || 1;
    elizaLogger8.debug(
      `[plugin-form][get-curves-sell-price] checking sell price for ${amount} curves of subject ${params.subject} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const balance = await this.wallet.getCurvesTokenBalance(
      curvesAddress,
      this.wallet.getAddress(),
      subjectAddress
    );
    if (balance < BigInt(amount)) {
      throw new Error(
        `Insufficient balance to sell ${amount} curves tokens. Current balance: ${formatEther(balance)}`
      );
    }
    const price = await this.wallet.getCurvesSellPrice(
      curvesAddress,
      subjectAddress,
      amount
    );
    return {
      subject: subjectAddress,
      amount,
      price,
      currentBalance: balance,
      formula,
      curvesAddress
    };
  }
};
var getCurvesSellPriceAction = {
  name: "get_curves_sell_price",
  description: "Check sell price for Curves tokens",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger8.debug(
      "[plugin-form][get-curves-sell-price] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new GetCurvesSellPriceAction(wallet);
    try {
      const params = await generateObjectDeprecated6({
        runtime,
        context: composeContext6({
          state: currentState,
          template: getCurvesSellPriceTemplate
        }),
        modelClass: ModelClass6.SMALL
      });
      params.formula = params.formula ?? "QUADRATIC";
      params.amount = params.amount ?? 1;
      const priceResp = await action.getPrice(params);
      if (callback) {
        callback({
          text: `Sell Price Quote:
Subject: ${priceResp.subject}
Amount: ${priceResp.amount} curves
Price: ${formatEther(priceResp.price)} ETH
Current Balance: ${formatEther(priceResp.currentBalance)} curves
Formula: ${priceResp.formula}`,
          content: {
            success: true,
            subject: priceResp.subject,
            amount: priceResp.amount,
            price: priceResp.price.toString(),
            priceFormatted: formatEther(priceResp.price),
            currentBalance: priceResp.currentBalance.toString(),
            formula: priceResp.formula,
            curvesAddress: priceResp.curvesAddress
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error(
        "[plugin-form][get-curves-sell-price] error getting price:",
        error
      );
      if (callback) {
        callback({
          text: `Error getting curves sell price: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you check the sell price for 1 curves token of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "GET_CURVES_SELL_PRICE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "How much can I get for selling curves of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e?",
          action: "GET_CURVES_SELL_PRICE"
        }
      }
    ]
  ],
  similes: [
    "GET_CURVES_SELL_PRICE",
    "CHECK_SELL_PRICE",
    "QUOTE_CURVES_SELL",
    "SIMULATE_CURVES_SELL",
    "EXIT_PRICE_CHECK"
  ]
};
var getCurvesSellPriceTemplate = `You are an AI assistant specialized in checking Form chain curves token sell prices. Your task is to extract the price check parameters from the conversation context.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract:
1. Subject address (whose curves to get sell price for)
2. Amount to simulate selling (defaults to 1 if not specified)
3. Determine the formula type based on context

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify and Quote Information:
 - Quote mentions of the subject address
 - Quote mentions of the amount to sell
 - Quote any references to formula type or market patterns
 - Note any mentioned current balance or holdings

2. Address Validation:
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Must follow hexadecimal format (0-9, a-f)

3. Amount Validation:
 - Must be a positive number
 - If not specified, use 1 as default
 - Cannot be zero
 - Can be a decimal (e.g., 0.5, 2.5)
 - Should not exceed mentioned balance (if any)

4. Formula Determination:
 If formula is explicitly mentioned:
 - QUADRATIC: Standard bonding curve
 - LOGARITHMIC: For high volume or stability focus

 If no formula mentioned, analyze:
 - Look for keywords suggesting high volume/stability needs
 - Consider mentioned market patterns
 - Look for exit strategy mentions
 - Default to QUADRATIC if context is unclear

5. Context Analysis:
 - Is this for portfolio exit?
 - Is this a price check before selling?
 - Are we comparing different sell amounts?
 - Any urgency in selling?

6. Final Summary:
 - Confirmed subject address
 - Validated sell amount
 - Selected formula with reasoning
 - Note any balance constraints

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
  "subject": string,    // Validated Ethereum address
  "amount": number,     // Positive number of tokens to simulate selling
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- Subject: valid Ethereum address (0x... format, 42 chars)
- Amount: positive number (defaults to 1)
- Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:

Checking sell price for 1 token:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 1,
  "formula": "QUADRATIC"
}
\`\`\`

Checking gradual exit price:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "amount": 0.5,
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the sell price check request and provide your response.`;

// src/actions/getCurvesBalance.ts
import {
  composeContext as composeContext7,
  elizaLogger as elizaLogger9,
  generateObjectDeprecated as generateObjectDeprecated7,
  ModelClass as ModelClass7
} from "@elizaos/core";
var GetCurvesBalanceAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async getBalance(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger9.debug(
      `[plugin-form][get-curves-balance] checking balance for subject ${params.subject} ${params.owner ? `owned by ${params.owner}` : "owned by connected wallet"} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = await this.wallet.resolveAddress(params.subject);
    const ownerAddress = params.owner ? await this.wallet.resolveAddress(params.owner) : this.wallet.getAddress();
    const balance = await this.wallet.getCurvesTokenBalance(
      curvesAddress,
      ownerAddress,
      subjectAddress
    );
    return {
      subject: subjectAddress,
      owner: ownerAddress,
      balance,
      formula,
      curvesAddress
    };
  }
};
var getCurvesBalanceAction = {
  name: "get_curves_balance",
  description: "Check Curves token balance for an owner of a certain subject",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger9.debug(
      "[plugin-form][get-curves-balance] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new GetCurvesBalanceAction(wallet);
    try {
      const params = await generateObjectDeprecated7({
        runtime,
        context: composeContext7({
          state: currentState,
          template: getCurvesBalanceTemplate
        }),
        modelClass: ModelClass7.SMALL
      });
      params.formula = params.formula ?? "QUADRATIC";
      const balanceResp = await action.getBalance(params);
      if (callback) {
        callback({
          text: `Curves Balance Details:
Owner: ${balanceResp.owner}
Subject: ${balanceResp.subject}
Balance: ${balanceResp.balance} curves
Curves Formula: ${balanceResp.formula}
Curves Address: ${balanceResp.curvesAddress}`,
          content: {
            success: true,
            subject: balanceResp.subject,
            owner: balanceResp.owner,
            balance: balanceResp.balance.toString(),
            formula: balanceResp.formula,
            curvesAddress: balanceResp.curvesAddress
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger9.error(
        "[plugin-form][get-curves-balance] error checking balance:",
        error
      );
      if (callback) {
        callback({
          text: `Error checking curves balance: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you check your curves balance for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "GET_CURVES_BALANCE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Show me my curves balance for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "GET_CURVES_BALANCE"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you check 0x742d35Cc6634C0532925a3b844Bc454e4438f44f curves balance for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "GET_CURVES_BALANCE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "How many curves tokens of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e do 0x742d35Cc6634C0532925a3b844Bc454e4438f44f have?",
          action: "SHOW_CURVES_HOLDINGS"
        }
      }
    ]
  ],
  similes: [
    "GET_CURVES_BALANCE",
    "CHECK_CURVES_BALANCE",
    "VIEW_CURVES_AMOUNT",
    "SHOW_CURVES_HOLDINGS"
  ]
};
var getCurvesBalanceTemplate = `You are an AI assistant specialized in checking Form chain curves token balances. Your task is to extract the query parameters from the conversation context.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract:
1. Subject address (whose curves to check balance for)
2. Owner address (optional, who holds the curves tokens - defaults to connected wallet)
3. Determine the formula type based on context

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify and Quote Information:
- Quote mentions of the subject address (whose curves)
- Quote mentions of the owner address (if different from connected wallet)
- Quote any references to formula type or trading patterns

2. Address Validation:
Subject Address:
- Must start with "0x"
- Must be exactly 42 characters long
- Must follow hexadecimal format (0-9, a-f)

Owner Address (if provided):
- Must start with "0x"
- Must be exactly 42 characters long
- Must follow hexadecimal format (0-9, a-f)
- If not specified, will use connected wallet

3. Formula Determination:
If formula is explicitly mentioned:
- QUADRATIC: Standard bonding curve
- LOGARITHMIC: For high volume or stability focus

If no formula mentioned, analyze:
- Look for keywords suggesting high volume/stability needs
- Consider mentioned use cases or patterns
- Default to QUADRATIC if context is unclear

4. Context Analysis:
- Is there a clear distinction between subject and owner?
- Are we checking someone else's holdings?
- Is the query about the connected wallet's holdings?

5. Final Summary:
- Confirmed subject address
- Owner address (specified or defaulting to connected wallet)
- Selected formula with reasoning

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
 "subject": string,     // Validated Ethereum address
 "owner": string|null,  // Optional validated Ethereum address or null for connected wallet
 "formula": string      // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- Subject: valid Ethereum address (0x... format, 42 chars)
- Owner: null or valid Ethereum address (0x... format, 42 chars)
- Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:

Checking connected wallet's holdings:
\`\`\`json
{
 "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
 "owner": null,
 "formula": "QUADRATIC"
}
\`\`\`

Checking specific owner's holdings:
\`\`\`json
{
 "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
 "owner": "0x123d35Cc6634C0532925a3b844Bc454e4438f789",
 "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the balance check request and provide your response.`;

// src/actions/getCurvesContract.ts
import {
  composeContext as composeContext8,
  elizaLogger as elizaLogger10,
  generateObjectDeprecated as generateObjectDeprecated8,
  ModelClass as ModelClass8
} from "@elizaos/core";
var GetCurvesAddressAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async getAddress(params) {
    elizaLogger10.debug(
      `[plugin-form][get-curves-address] resolving contract for formula ${params.formula}`
    );
    const curvesAddress = this.wallet.getCurvesAddress(params.formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${params.formula} on chain ${this.wallet.getChain().id}`
      );
    }
    return {
      address: curvesAddress,
      formula: params.formula
    };
  }
};
var buildGetCurvesAddressDetails = async (state, runtime) => {
  const context = composeContext8({
    state,
    template: getCurvesFormulaTemplate
  });
  return await generateObjectDeprecated8({
    runtime,
    context,
    modelClass: ModelClass8.SMALL
  });
};
var getCurvesAddressAction = {
  name: "get_curves_address",
  description: "Get the appropriate curves contract address",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger10.debug(
      "[plugin-form][get-curves-address] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new GetCurvesAddressAction(wallet);
    try {
      const params = await buildGetCurvesAddressDetails(currentState, runtime);
      const result = await action.getAddress(params);
      if (callback) {
        callback({
          text: `Resolved curves contract address ${result.address} for formula ${result.formula}`,
          content: {
            success: true,
            curvesContractAddress: result.address,
            curvesFormula: result.formula
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger10.error(
        "[plugin-form][get-curves-address] error resolving curves address:",
        error
      );
      if (callback) {
        callback({
          text: `Error resolving curves contract: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help determine the appropriate curves contract for large curves bound groups",
          action: "GET_CURVES_ADDRESS"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "What curves contract should I use for large curves bound groups?",
          action: "GET_CURVES_ADDRESS"
        }
      }
    ]
  ],
  similes: [
    "RESOLVE_CURVES_CONTRACT",
    "GET_CURVES_CONTRACT",
    "FIND_CURVES_ADDRESS"
  ]
};
var getCurvesFormulaTemplate = `You are an AI assistant specialized in determining the appropriate Form chain curves formula type based on conversation context. Your task is to analyze the discussion and synthesize the formula involved.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to determine which formula type should be used based on the discussion context.

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Context Analysis:
 - Is there any explicit mention of a formula type?
 - Are there keywords suggesting specific use cases? (e.g. "stable", "large groups", "small groups", "quadratic", "logarithmic")
 - What is the overall intent of the curves interaction?

2. Formula Selection Logic:
 If explicit formula mentioned from "Available Curves Formulas":
 - QUADRATIC: Standard bonding curve with quadratic price impact
 - LOGARITHMIC: Reduced price impact for high volume

 If no formula mentioned:
 - Default to QUADRATIC unless context strongly suggests otherwise
 - Look for terms indicating high volume or price stability needs

3. Validation:
 - Confirm the selected formula is one of the supported types
 - Verify the reasoning aligns with use case
 - Check if selection matches any stated requirements

4. Decision Summary:
 - State the selected formula
 - Provide brief reasoning for selection

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
  "formula": string    // Must be exactly one of "Available Curves Formulas"
}
\`\`\`

Remember:
- Default to "QUADRATIC" if context is unclear
- "LOGARITHMIC" is for high volume or stability-focused use cases
- Always exactly match case for formula names

Example responses:

For general use:
\`\`\`json
{
  "formula": "QUADRATIC"
}
\`\`\`

For high volume and large groups of curves holders:
\`\`\`json
{
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the discussion context and determine the appropriate formula.`;

// src/actions/mintCurvesERC20.ts
import {
  composeContext as composeContext9,
  elizaLogger as elizaLogger11,
  generateObjectDeprecated as generateObjectDeprecated9,
  ModelClass as ModelClass9
} from "@elizaos/core";
var MintCurvesERC20TokenAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async mint(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger11.debug(
      `[plugin-form][mint-curves-erc20] minting ERC20 token "${params.name}" (${params.symbol}) using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const tx = await this.wallet.mintCurvesERC20Token(
      curvesAddress,
      params.name,
      params.symbol
    );
    const erc20Info = await this.wallet.getCurvesERC20TokenDetails(
      curvesAddress,
      this.wallet.getAddress()
    );
    return {
      hash: tx.transactionHash,
      walletAddress: this.wallet.getAddress(),
      name: params.name,
      symbol: params.symbol,
      formula,
      curvesAddress,
      erc20Token: erc20Info
    };
  }
};
var mintCurvesERC20TokenAction = {
  name: "mint_curves_erc20_token",
  description: "Mint a new ERC20 token for Curves holdings",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger11.debug(
      "[plugin-form][mint-curves-erc20] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new MintCurvesERC20TokenAction(wallet);
    try {
      const mintParams = await generateObjectDeprecated9({
        runtime,
        context: composeContext9({
          state: currentState,
          template: mintCurvesERC20Template
        }),
        modelClass: ModelClass9.SMALL
      });
      mintParams.formula = mintParams.formula ?? "QUADRATIC";
      const mintResp = await action.mint(mintParams);
      if (callback) {
        callback({
          text: `Successfully minted ERC20 token "${mintResp.name}" (${mintResp.symbol})
Transaction Hash: ${mintResp.hash}
ERC20 Token Address: ${mintResp.erc20Token.address}`,
          content: {
            success: true,
            hash: mintResp.hash,
            subject: wallet.getAddress(),
            name: mintResp.name,
            symbol: mintResp.symbol,
            formula: mintResp.formula,
            curvesAddress: mintResp.curvesAddress,
            erc20Token: mintResp.erc20Token
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger11.error(
        "[plugin-form][mint-curves-erc20] error during token minting:",
        error
      );
      if (callback) {
        callback({
          text: `Error minting ERC20 token: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you mint an ERC20 token 'Community Token' with symbol 'CT' for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "MINT_CURVES_ERC20"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Create ERC20 token for my curves at 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "MINT_CURVES_ERC20"
        }
      }
    ]
  ],
  similes: ["MINT_CURVES_ERC20", "CREATE_CURVES_TOKEN", "NEW_CURVES_ERC20"]
};
var mintCurvesERC20Template = `You are an AI assistant specialized in minting Form chain ERC20 tokens for Curves. Your task is to extract token information and determine the appropriate formula from the conversation context. The mint will be executed using the connected wallet address.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract:
1. ERC20 token name (must be valid token name)
2. ERC20 token symbol (must be valid token symbol)
3. Determine the formula type based on context

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify and Quote Information:
 - Quote mentions of token name
 - Quote mentions of token symbol
 - Quote any references to formula type or trading patterns

2. Token Name Validation:
 - Must be 1-32 characters long
 - Can include letters, numbers, and spaces
 - Cannot contain special characters except spaces
 - Must be meaningful and descriptive

3. Token Symbol Validation:
 - Must be 1-8 characters long
 - Uppercase letters and numbers only
 - No spaces or special characters
 - Should represent the token name

4. Formula Determination:
 If formula is explicitly mentioned:
 - QUADRATIC: Standard bonding curve
 - LOGARITHMIC: For high volume or stability focus

 If no formula mentioned, analyze:
 - Look for keywords suggesting high volume/stability needs
 - Consider mentioned use cases or patterns
 - Default to QUADRATIC if context is unclear

5. Error Checking:
 - Invalid token name format or length
 - Invalid symbol format or length
 - Unsupported formula types
 - Name/symbol already in use (if mentioned)

6. Final Summary:
 - Validated token name and symbol
 - Selected formula with reasoning

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
  "name": string,       // Token name (1-32 chars)
  "symbol": string,     // Token symbol (1-8 chars, uppercase)
  "formula": string     // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- Name: 1-32 characters, letters/numbers/spaces only
- Symbol: 1-8 characters, uppercase letters/numbers only
- Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:
\`\`\`json
{
  "name": "Shiba v2",
  "symbol": "SHV2",
  "formula": "QUADRATIC"
}
\`\`\`

\`\`\`json
{
  "name": "Space Dreamers",
  "symbol": "SPDR",
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the minting request and provide your response.`;

// src/actions/getCurvesERC20.ts
import {
  composeContext as composeContext10,
  elizaLogger as elizaLogger12,
  generateObjectDeprecated as generateObjectDeprecated10,
  ModelClass as ModelClass10
} from "@elizaos/core";
var GetCurvesERC20DetailsAction = class {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async getDetails(params) {
    const formula = params.formula || "QUADRATIC";
    elizaLogger12.debug(
      `[plugin-form][get-curves-erc20-details] fetching ERC20 details for ${params.subject || "connected wallet"} using ${formula} formula`
    );
    const curvesAddress = this.wallet.getCurvesAddress(formula);
    if (!curvesAddress) {
      throw new Error(
        `No curves contract found for formula ${formula} on chain ${this.wallet.getChain().id}`
      );
    }
    const subjectAddress = params.subject ? await this.wallet.resolveAddress(params.subject) : this.wallet.getAddress();
    const erc20Info = await this.wallet.getCurvesERC20TokenDetails(
      curvesAddress,
      subjectAddress
    );
    return {
      subject: subjectAddress,
      formula,
      curvesAddress,
      erc20Token: erc20Info
    };
  }
};
var getCurvesERC20DetailsAction = {
  name: "get_curves_erc20_details",
  description: "Get ERC20 token details for Curves holdings",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    elizaLogger12.debug(
      "[plugin-form][get-curves-erc20-details] action handler called"
    );
    const isTestnet = runtime.getSetting("FORM_TESTNET") === "true";
    const privateKey = runtime.getSetting(
      "FORM_PRIVATE_KEY"
    );
    const wallet = new FormWalletClient(
      privateKey,
      runtime.cacheManager,
      isTestnet
    );
    const action = new GetCurvesERC20DetailsAction(wallet);
    try {
      const params = await generateObjectDeprecated10({
        runtime,
        context: composeContext10({
          state: currentState,
          template: getERC20DetailsTemplate
        }),
        modelClass: ModelClass10.SMALL
      });
      params.formula = params.formula ?? "QUADRATIC";
      const detailsResp = await action.getDetails(params);
      if (callback) {
        callback({
          text: `ERC20 Token Details:
Name: ${detailsResp.erc20Token.name}
Symbol: ${detailsResp.erc20Token.symbol}
Address: ${detailsResp.erc20Token.address}
Decimals: ${detailsResp.erc20Token.decimals}
Owner: ${detailsResp.subject}`,
          content: {
            success: true,
            subject: detailsResp.subject,
            formula: detailsResp.formula,
            curvesAddress: detailsResp.curvesAddress,
            erc20Token: detailsResp.erc20Token
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger12.error(
        "[plugin-form][get-curves-erc20-details] error getting token details:",
        error
      );
      if (callback) {
        callback({
          text: `Error getting ERC20 token details: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FORM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{agentName}}",
        content: {
          text: "I'll help you get ERC20 token details for your curves",
          action: "GET_CURVES_ERC20_DETAILS"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Show me my curves ERC20 token details",
          action: "GET_CURVES_ERC20_DETAILS"
        }
      }
    ]
  ],
  similes: [
    "GET_CURVES_ERC20_DETAILS",
    "SHOW_CURVES_TOKEN",
    "VIEW_ERC20_INFO"
  ]
};
var getERC20DetailsTemplate = `You are an AI assistant specialized in retrieving Form chain ERC20 token details. Your task is to extract the query parameters from the conversation context.

First, review the recent messages from the conversation:
<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract:
1. Optional subject address (defaults to connected wallet if not specified)
2. Determine the formula type based on context

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify and Quote Information:
 - Quote any mention of a specific address to query (if present)
 - Quote any references to formula type or trading patterns
 - Quote any context about whose token details are being requested

2. Optional Subject Address Validation (if provided):
 - Must start with "0x"
 - Must be exactly 42 characters long
 - Must follow hexadecimal format (0-9, a-f)
 - If no address mentioned, will use connected wallet

3. Formula Determination:
 If formula is explicitly mentioned:
 - QUADRATIC: Standard bonding curve
 - LOGARITHMIC: For high volume or stability focus

 If no formula mentioned, analyze:
 - Look for keywords suggesting high volume/stability needs
 - Consider mentioned use cases or patterns
 - Default to QUADRATIC if context is unclear

4. Final Summary:
 - Note if using specified address or defaulting to connected wallet
 - Selected formula with reasoning

After your analysis, provide the final output in a JSON markdown block:
\`\`\`json
{
  "subject": string | null,  // Optional Ethereum address or null for connected wallet
  "formula": string          // Either "QUADRATIC" or "LOGARITHMIC"
}
\`\`\`

Requirements:
- Subject: null or valid Ethereum address (0x... format, 42 chars)
- Formula: exactly "QUADRATIC" or "LOGARITHMIC" (defaults to "QUADRATIC")

Example valid outputs:

For connected wallet:
\`\`\`json
{
  "subject": null,
  "formula": "QUADRATIC"
}
\`\`\`

For specific address:
\`\`\`json
{
  "subject": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "formula": "LOGARITHMIC"
}
\`\`\`

{{providers}}

Now, analyze the token details request and provide your response.`;

// src/index.ts
var formPlugin = {
  name: "form",
  description: "Form Plugin for Eliza",
  providers: [curvesFormulaProvider, formWalletProvider],
  actions: [
    buyCurvesTokenAction,
    sellCurvesTokenAction,
    withdrawCurvesTokenAction,
    depositCurvesTokenAction,
    getCurvesBuyPriceAction,
    getCurvesSellPriceAction,
    getCurvesBalanceAction,
    getCurvesAddressAction,
    mintCurvesERC20TokenAction,
    getCurvesERC20DetailsAction
  ],
  evaluators: []
};
var index_default = formPlugin;
export {
  index_default as default,
  formPlugin
};
