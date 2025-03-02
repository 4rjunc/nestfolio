import {
  secp256k1
} from "./chunk-4L6P6TY5.js";
import {
  BaseError,
  BytesSizeMismatchError,
  FeeCapTooHighError,
  Hash,
  InvalidAddressError,
  InvalidChainIdError,
  InvalidLegacyVError,
  InvalidSerializableTransactionError,
  InvalidStorageKeySizeError,
  TipAboveFeeCapError,
  aexists,
  aoutput,
  bytesRegex,
  bytesToHex,
  checksumAddress,
  concat,
  concatHex,
  createCursor,
  createView,
  encodeAbiParameters,
  hexToBigInt,
  hexToBytes,
  hexToNumber,
  integerRegex,
  isAddress,
  isHex,
  keccak256,
  maxUint256,
  numberToHex,
  rotr,
  size,
  slice,
  stringToHex,
  stringify,
  toBytes,
  toBytes2,
  toHex,
  trim,
  wrapConstructor
} from "./chunk-NTU6R7BC.js";
import "./chunk-PR4QN5HX.js";

// src/index.ts
import { elizaLogger as elizaLogger5 } from "@elizaos/core";

// ../../node_modules/viem/node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value, isLE) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE);
  const _32n = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE ? 4 : 0;
  const l = isLE ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE);
  view.setUint32(byteOffset + l, wl, isLE);
}
var Chi = (a, b, c) => a & b ^ ~a & c;
var Maj = (a, b, c) => a & b ^ a & c ^ b & c;
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE) {
    super();
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    const { view, buffer, blockLen } = this;
    data = toBytes(data);
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    this.buffer.subarray(pos).fill(0);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.length = length;
    to.pos = pos;
    to.finished = finished;
    to.destroyed = destroyed;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
};

// ../../node_modules/viem/node_modules/@noble/hashes/esm/sha256.js
var SHA256_K = /* @__PURE__ */ new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_IV = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
  constructor() {
    super(64, 32, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    SHA256_W.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    this.buffer.fill(0);
  }
};
var sha256 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

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

// ../../node_modules/viem/_esm/accounts/utils/publicKeyToAddress.js
function publicKeyToAddress(publicKey) {
  const address = keccak256(`0x${publicKey.substring(4)}`).substring(26);
  return checksumAddress(`0x${address}`);
}

// ../../node_modules/viem/_esm/utils/signature/serializeSignature.js
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

// ../../node_modules/viem/_esm/accounts/utils/sign.js
var extraEntropy = false;
async function sign({ hash, privateKey, to = "object" }) {
  const { r, s, recovery } = secp256k1.sign(hash.slice(2), privateKey.slice(2), { lowS: true, extraEntropy });
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

// ../../node_modules/viem/_esm/accounts/utils/signMessage.js
async function signMessage({ message, privateKey }) {
  return await sign({ hash: hashMessage(message), privateKey, to: "hex" });
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
function sha2562(value, to_) {
  const to = to_ || "hex";
  const bytes = sha256(isHex(value, { strict: false }) ? toBytes2(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}

// ../../node_modules/viem/_esm/utils/blob/commitmentToVersionedHash.js
function commitmentToVersionedHash(parameters) {
  const { commitment, version = 1 } = parameters;
  const to = parameters.to ?? (typeof commitment === "string" ? "hex" : "bytes");
  const versionedHash = sha2562(commitment, "bytes");
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
  constructor({ maxSize, size: size2 }) {
    super("Blob size is too large.", {
      metaMessages: [`Max: ${maxSize} bytes`, `Given: ${size2} bytes`],
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
  constructor({ hash, size: size2 }) {
    super(`Versioned hash "${hash}" size is invalid.`, {
      metaMessages: ["Expected: 32", `Received: ${size2}`],
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
    let size2 = 0;
    while (size2 < fieldElementsPerBlob) {
      const bytes = data.slice(position, position + (bytesPerFieldElement - 1));
      blob.pushByte(0);
      blob.pushBytes(bytes);
      if (bytes.length < 31) {
        blob.pushByte(128);
        active = false;
        break;
      }
      size2++;
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

// ../../node_modules/viem/_esm/accounts/utils/signTransaction.js
async function signTransaction(parameters) {
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

// ../../node_modules/viem/_esm/utils/typedData.js
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

// ../../node_modules/viem/_esm/accounts/utils/signTypedData.js
async function signTypedData(parameters) {
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
  const publicKey = toHex(secp256k1.getPublicKey(privateKey.slice(2), false));
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
      return signMessage({ message, privateKey });
    },
    async signTransaction(transaction, { serializer } = {}) {
      return signTransaction({ privateKey, transaction, serializer });
    },
    async signTypedData(typedData) {
      return signTypedData({ ...typedData, privateKey });
    }
  });
  return {
    ...account,
    publicKey,
    source: "privateKey"
  };
}

// src/client.ts
import { elizaLogger } from "@elizaos/core";
import {
  LensClient as LensClientCore,
  production,
  LensTransactionStatusType,
  LimitType,
  NotificationType,
  PublicationType,
  FeedEventItemType
} from "@lens-protocol/client";

// src/utils.ts
import { stringToUuid } from "@elizaos/core";
function publicationId({
  pubId,
  agentId
}) {
  return `${pubId}-${agentId}`;
}
function publicationUuid(props) {
  return stringToUuid(publicationId(props));
}
var handleBroadcastResult = (broadcastResult) => {
  const broadcastValue = broadcastResult.unwrap();
  if ("id" in broadcastValue || "txId" in broadcastValue) {
    return broadcastValue;
  } else {
    throw new Error();
  }
};
var getProfilePictureUri = (picture) => {
  if ("optimized" in picture) {
    return picture.optimized?.uri || picture.raw?.uri || picture.uri;
  } else {
    return picture.uri;
  }
};
function omit(obj, key) {
  const result = {};
  Object.keys(obj).forEach((currentKey) => {
    if (currentKey !== key) {
      result[currentKey] = obj[currentKey];
    }
  });
  return result;
}

// src/client.ts
var LensClient = class {
  runtime;
  account;
  cache;
  lastInteractionTimestamp;
  profileId;
  authenticated;
  authenticatedProfile;
  core;
  constructor(opts) {
    this.cache = opts.cache;
    this.runtime = opts.runtime;
    this.account = opts.account;
    this.core = new LensClientCore({
      environment: production
    });
    this.lastInteractionTimestamp = /* @__PURE__ */ new Date();
    this.profileId = opts.profileId;
    this.authenticated = false;
    this.authenticatedProfile = null;
  }
  async authenticate() {
    try {
      const { id, text } = await this.core.authentication.generateChallenge({
        signedBy: this.account.address,
        for: this.profileId
      });
      const signature = await this.account.signMessage({
        message: text
      });
      await this.core.authentication.authenticate({ id, signature });
      this.authenticatedProfile = await this.core.profile.fetch({
        forProfileId: this.profileId
      });
      this.authenticated = true;
    } catch (error) {
      elizaLogger.error("client-lens::client error: ", error);
      throw error;
    }
  }
  async createPublication(contentURI, onchain = false, commentOn) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
        elizaLogger.log("done authenticating");
      }
      let broadcastResult;
      if (commentOn) {
        broadcastResult = onchain ? await this.createCommentOnchain(contentURI, commentOn) : await this.createCommentMomoka(contentURI, commentOn);
      } else {
        broadcastResult = onchain ? await this.createPostOnchain(contentURI) : await this.createPostMomoka(contentURI);
      }
      elizaLogger.log("broadcastResult", broadcastResult);
      if (broadcastResult.id) {
        return await this.core.publication.fetch({
          forId: broadcastResult.id
        });
      }
      const completion = await this.core.transaction.waitUntilComplete({
        forTxHash: broadcastResult.txHash
      });
      if (completion?.status === LensTransactionStatusType.Complete) {
        return await this.core.publication.fetch({
          forTxHash: completion?.txHash
        });
      }
    } catch (error) {
      elizaLogger.error("client-lens::client error: ", error);
      throw error;
    }
  }
  async getPublication(pubId) {
    if (this.cache.has(`lens/publication/${pubId}`)) {
      return this.cache.get(`lens/publication/${pubId}`);
    }
    const publication = await this.core.publication.fetch({ forId: pubId });
    if (publication)
      this.cache.set(`lens/publication/${pubId}`, publication);
    return publication;
  }
  async getPublicationsFor(profileId, limit = 50) {
    const timeline = [];
    let next = void 0;
    do {
      const { items, next: newNext } = next ? await next() : await this.core.publication.fetchAll({
        limit: LimitType.Fifty,
        where: {
          from: [profileId],
          publicationTypes: [PublicationType.Post]
        }
      });
      items.forEach((publication) => {
        this.cache.set(
          `lens/publication/${publication.id}`,
          publication
        );
        timeline.push(publication);
      });
      next = newNext;
    } while (next && timeline.length < limit);
    return timeline;
  }
  async getMentions() {
    if (!this.authenticated) {
      await this.authenticate();
    }
    const result = await this.core.notifications.fetch({
      where: {
        highSignalFilter: false,
        // true,
        notificationTypes: [
          NotificationType.Mentioned,
          NotificationType.Commented
        ]
      }
    });
    const mentions = [];
    const { items, next } = result.unwrap();
    items.map((notification) => {
      let item;
      if ("publication" in notification) {
        item = notification.publication;
      } else if ("comment" in notification) {
        item = notification.comment;
      } else {
        return;
      }
      if (!item.isEncrypted) {
        mentions.push(item);
        this.cache.set(`lens/publication/${item.id}`, item);
      }
    });
    return { mentions, next };
  }
  async getProfile(profileId) {
    if (this.cache.has(`lens/profile/${profileId}`)) {
      return this.cache.get(`lens/profile/${profileId}`);
    }
    const result = await this.core.profile.fetch({
      forProfileId: profileId
    });
    if (!result?.id) {
      elizaLogger.error("Error fetching user by profileId");
      throw "getProfile ERROR";
    }
    const profile = {
      id: "",
      profileId,
      name: "",
      handle: ""
    };
    profile.id = result.id;
    profile.name = result.metadata?.displayName;
    profile.handle = result.handle?.localName;
    profile.bio = result.metadata?.bio;
    profile.pfp = getProfilePictureUri(result.metadata?.picture);
    this.cache.set(`lens/profile/${profileId}`, profile);
    return profile;
  }
  async getTimeline(profileId, limit = 10) {
    try {
      if (!this.authenticated) {
        await this.authenticate();
      }
      const timeline = [];
      let next = void 0;
      do {
        const result = next ? await next() : await this.core.feed.fetch({
          where: {
            for: profileId,
            feedEventItemTypes: [FeedEventItemType.Post]
          }
        });
        const data = result.unwrap();
        data.items.forEach((item) => {
          if (timeline.length < limit && !item.root.isEncrypted) {
            this.cache.set(
              `lens/publication/${item.id}`,
              item.root
            );
            timeline.push(item.root);
          }
        });
        next = data.pageInfo.next;
      } while (next && timeline.length < limit);
      return timeline;
    } catch (error) {
      elizaLogger.error(error);
      throw new Error("client-lens:: getTimeline");
    }
  }
  async createPostOnchain(contentURI) {
    if (this.authenticatedProfile?.signless) {
      const broadcastResult2 = await this.core.publication.postOnchain({
        contentURI,
        openActionModules: []
        // TODO: if collectable
      });
      return handleBroadcastResult(broadcastResult2);
    }
    const typedDataResult = await this.core.publication.createOnchainPostTypedData({
      contentURI,
      openActionModules: []
      // TODO: if collectable
    });
    const { id, typedData } = typedDataResult.unwrap();
    const signedTypedData = await this.account.signTypedData({
      domain: omit(typedData.domain, "__typename"),
      types: omit(typedData.types, "__typename"),
      primaryType: "Post",
      message: omit(typedData.value, "__typename")
    });
    const broadcastResult = await this.core.transaction.broadcastOnchain({
      id,
      signature: signedTypedData
    });
    return handleBroadcastResult(broadcastResult);
  }
  async createPostMomoka(contentURI) {
    elizaLogger.log("createPostMomoka");
    if (this.authenticatedProfile?.signless) {
      const broadcastResult2 = await this.core.publication.postOnMomoka({
        contentURI
      });
      return handleBroadcastResult(broadcastResult2);
    }
    const typedDataResult = await this.core.publication.createMomokaPostTypedData({
      contentURI
    });
    elizaLogger.log("typedDataResult", typedDataResult);
    const { id, typedData } = typedDataResult.unwrap();
    const signedTypedData = await this.account.signTypedData({
      domain: omit(typedData.domain, "__typename"),
      types: omit(typedData.types, "__typename"),
      primaryType: "Post",
      message: omit(typedData.value, "__typename")
    });
    const broadcastResult = await this.core.transaction.broadcastOnMomoka({
      id,
      signature: signedTypedData
    });
    return handleBroadcastResult(broadcastResult);
  }
  async createCommentOnchain(contentURI, commentOn) {
    if (this.authenticatedProfile?.signless) {
      const broadcastResult2 = await this.core.publication.commentOnchain({
        commentOn,
        contentURI
      });
      return handleBroadcastResult(broadcastResult2);
    }
    const typedDataResult = await this.core.publication.createOnchainCommentTypedData({
      commentOn,
      contentURI
    });
    const { id, typedData } = typedDataResult.unwrap();
    const signedTypedData = await this.account.signTypedData({
      domain: omit(typedData.domain, "__typename"),
      types: omit(typedData.types, "__typename"),
      primaryType: "Comment",
      message: omit(typedData.value, "__typename")
    });
    const broadcastResult = await this.core.transaction.broadcastOnchain({
      id,
      signature: signedTypedData
    });
    return handleBroadcastResult(broadcastResult);
  }
  async createCommentMomoka(contentURI, commentOn) {
    if (this.authenticatedProfile?.signless) {
      const broadcastResult2 = await this.core.publication.commentOnMomoka(
        {
          commentOn,
          contentURI
        }
      );
      return handleBroadcastResult(broadcastResult2);
    }
    const typedDataResult = await this.core.publication.createMomokaCommentTypedData({
      commentOn,
      contentURI
    });
    const { id, typedData } = typedDataResult.unwrap();
    const signedTypedData = await this.account.signTypedData({
      domain: omit(typedData.domain, "__typename"),
      types: omit(typedData.types, "__typename"),
      primaryType: "Comment",
      message: omit(typedData.value, "__typename")
    });
    const broadcastResult = await this.core.transaction.broadcastOnMomoka({
      id,
      signature: signedTypedData
    });
    return handleBroadcastResult(broadcastResult);
  }
};

// src/post.ts
import {
  composeContext,
  generateText,
  ModelClass,
  stringToUuid as stringToUuid3,
  elizaLogger as elizaLogger3
} from "@elizaos/core";

// src/prompts.ts
import {
  messageCompletionFooter,
  shouldRespondFooter
} from "@elizaos/core";
var formatPublication = (publication) => {
  return `ID: ${publication.id}
    From: ${publication.by.metadata?.displayName} (@${publication.by.handle?.localName})${publication.by.handle?.localName})${publication.commentOn ? `
In reply to: @${publication.commentOn.by.handle?.localName}` : ""}
Text: ${publication.metadata.content}`;
};
var formatTimeline = (character, timeline) => `# ${character.name}'s Home Timeline
${timeline.map(formatPublication).join("\n")}
`;
var headerTemplate = `
{{timeline}}

# Knowledge
{{knowledge}}

About {{agentName}} (@{{lensHandle}}):
{{bio}}
{{lore}}
{{postDirections}}

{{providers}}

{{recentPosts}}

{{characterPostExamples}}`;
var postTemplate = headerTemplate + `
# Task: Generate a post in the voice and style of {{agentName}}, aka @{{lensHandle}}
Write a single sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}.
Try to write something totally different than previous posts. Do not add commentary or ackwowledge this request, just write the post.

Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.`;
var messageHandlerTemplate = headerTemplate + `
Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

Thread of publications You Are Replying To:
{{formattedConversation}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{lensHandle}}):
{{currentPost}}` + messageCompletionFooter;
var shouldRespondTemplate = (
  //
  `# Task: Decide if {{agentName}} should respond.
    About {{agentName}}:
    {{bio}}

    # INSTRUCTIONS: Determine if {{agentName}} (@{{lensHandle}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "RESPOND" or "IGNORE" or "STOP".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
If a message thread has become repetitive, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} (aka @{{lensHandle}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

Thread of messages You Are Replying To:
{{formattedConversation}}

Current message:
{{currentPost}}

` + shouldRespondFooter
);

// src/memory.ts
import {
  elizaLogger as elizaLogger2,
  getEmbeddingZeroVector,
  stringToUuid as stringToUuid2
} from "@elizaos/core";
function createPublicationMemory({
  roomId,
  runtime,
  publication
}) {
  const commentOn = publication.commentOn ? publicationUuid({
    pubId: publication.commentOn.id,
    agentId: runtime.agentId
  }) : void 0;
  return {
    id: publicationUuid({
      pubId: publication.id,
      agentId: runtime.agentId
    }),
    agentId: runtime.agentId,
    userId: runtime.agentId,
    content: {
      text: publication.metadata.content,
      source: "lens",
      url: "",
      commentOn,
      id: publication.id
    },
    roomId,
    embedding: getEmbeddingZeroVector()
  };
}
async function buildConversationThread({
  publication,
  runtime,
  client
}) {
  const thread = [];
  const visited = /* @__PURE__ */ new Set();
  async function processThread(currentPublication) {
    if (visited.has(currentPublication.id)) {
      return;
    }
    visited.add(currentPublication.id);
    const roomId = publicationUuid({
      pubId: currentPublication.id,
      agentId: runtime.agentId
    });
    const memory = await runtime.messageManager.getMemoryById(roomId);
    if (!memory) {
      elizaLogger2.log(
        "Creating memory for publication",
        currentPublication.id
      );
      const userId = stringToUuid2(currentPublication.by.id);
      await runtime.ensureConnection(
        userId,
        roomId,
        currentPublication.by.id,
        currentPublication.by.metadata?.displayName || currentPublication.by.handle?.localName,
        "lens"
      );
      await runtime.messageManager.createMemory(
        createPublicationMemory({
          roomId,
          runtime,
          publication: currentPublication
        })
      );
    }
    thread.unshift(currentPublication);
    if (currentPublication.commentOn) {
      const parentPublication = await client.getPublication(
        currentPublication.commentOn.id
      );
      if (parentPublication) await processThread(parentPublication);
    }
  }
  await processThread(publication);
  return thread;
}

// src/actions.ts
import { textOnly } from "@lens-protocol/metadata";
async function sendPublication({
  client,
  runtime,
  content,
  roomId,
  commentOn,
  ipfs
}) {
  const metadata = textOnly({ content: content.text });
  const contentURI = await ipfs.pinJson(metadata);
  const publication = await client.createPublication(
    contentURI,
    false,
    // TODO: support collectable settings
    commentOn
  );
  if (publication) {
    return {
      publication,
      memory: createPublicationMemory({
        roomId,
        runtime,
        publication
      })
    };
  }
  return {};
}

// src/post.ts
var LensPostManager = class {
  constructor(client, runtime, profileId, cache, ipfs) {
    this.client = client;
    this.runtime = runtime;
    this.profileId = profileId;
    this.cache = cache;
    this.ipfs = ipfs;
  }
  timeout;
  async start() {
    const generateNewPubLoop = async () => {
      try {
        await this.generateNewPublication();
      } catch (error) {
        elizaLogger3.error(error);
        return;
      }
      this.timeout = setTimeout(
        generateNewPubLoop,
        (Math.floor(Math.random() * (4 - 1 + 1)) + 1) * 60 * 60 * 1e3
      );
    };
    generateNewPubLoop();
  }
  async stop() {
    if (this.timeout) clearTimeout(this.timeout);
  }
  async generateNewPublication() {
    elizaLogger3.info("Generating new publication");
    try {
      const profile = await this.client.getProfile(this.profileId);
      await this.runtime.ensureUserExists(
        this.runtime.agentId,
        profile.handle,
        this.runtime.character.name,
        "lens"
      );
      const timeline = await this.client.getTimeline(this.profileId);
      const formattedHomeTimeline = formatTimeline(
        this.runtime.character,
        timeline
      );
      const generateRoomId = stringToUuid3("lens_generate_room");
      const state = await this.runtime.composeState(
        {
          roomId: generateRoomId,
          userId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          content: { text: "", action: "" }
        },
        {
          lensHandle: profile.handle,
          timeline: formattedHomeTimeline
        }
      );
      const context = composeContext({
        state,
        template: this.runtime.character.templates?.lensPostTemplate || postTemplate
      });
      const content = await generateText({
        runtime: this.runtime,
        context,
        modelClass: ModelClass.SMALL
      });
      if (this.runtime.getSetting("LENS_DRY_RUN") === "true") {
        elizaLogger3.info(`Dry run: would have posted: ${content}`);
        return;
      }
      try {
        const { publication } = await sendPublication({
          client: this.client,
          runtime: this.runtime,
          roomId: generateRoomId,
          content: { text: content },
          ipfs: this.ipfs
        });
        if (!publication) throw new Error("failed to send publication");
        const roomId = publicationUuid({
          agentId: this.runtime.agentId,
          pubId: publication.id
        });
        await this.runtime.ensureRoomExists(roomId);
        await this.runtime.ensureParticipantInRoom(
          this.runtime.agentId,
          roomId
        );
        elizaLogger3.info(`[Lens Client] Published ${publication.id}`);
        await this.runtime.messageManager.createMemory(
          createPublicationMemory({
            roomId,
            runtime: this.runtime,
            publication
          })
        );
      } catch (error) {
        elizaLogger3.error("Error sending publication:", error);
      }
    } catch (error) {
      elizaLogger3.error("Error generating new publication:", error);
    }
  }
};

// src/interactions.ts
import {
  composeContext as composeContext2,
  generateMessageResponse,
  generateShouldRespond,
  ModelClass as ModelClass2,
  stringToUuid as stringToUuid4,
  elizaLogger as elizaLogger4
} from "@elizaos/core";
var LensInteractionManager = class {
  constructor(client, runtime, profileId, cache, ipfs) {
    this.client = client;
    this.runtime = runtime;
    this.profileId = profileId;
    this.cache = cache;
    this.ipfs = ipfs;
  }
  timeout;
  async start() {
    const handleInteractionsLoop = async () => {
      try {
        await this.handleInteractions();
      } catch (error) {
        elizaLogger4.error(error);
        return;
      }
      this.timeout = setTimeout(
        handleInteractionsLoop,
        Number(this.runtime.getSetting("LENS_POLL_INTERVAL") || 120) * 1e3
        // Default to 2 minutes
      );
    };
    handleInteractionsLoop();
  }
  async stop() {
    if (this.timeout) clearTimeout(this.timeout);
  }
  async handleInteractions() {
    elizaLogger4.info("Handle Lens interactions");
    const { mentions } = await this.client.getMentions();
    const agent = await this.client.getProfile(this.profileId);
    for (const mention of mentions) {
      let hasContent2 = function(metadata) {
        return metadata && typeof metadata.content === "string";
      };
      var hasContent = hasContent2;
      const messageHash = toHex(mention.id);
      const conversationId = `${messageHash}-${this.runtime.agentId}`;
      const roomId = stringToUuid4(conversationId);
      const userId = stringToUuid4(mention.by.id);
      const pastMemoryId = publicationUuid({
        agentId: this.runtime.agentId,
        pubId: mention.id
      });
      const pastMemory = await this.runtime.messageManager.getMemoryById(pastMemoryId);
      if (pastMemory) {
        continue;
      }
      await this.runtime.ensureConnection(
        userId,
        roomId,
        mention.by.id,
        mention.by.metadata?.displayName || mention.by.handle?.localName,
        "lens"
      );
      const thread = await buildConversationThread({
        client: this.client,
        runtime: this.runtime,
        publication: mention
      });
      let memory;
      if ((mention.__typename === "Post" || mention.__typename === "Comment" || mention.__typename === "Quote") && hasContent2(mention.metadata)) {
        memory = {
          content: { text: mention.metadata.content, hash: mention.id },
          agentId: this.runtime.agentId,
          userId,
          roomId
        };
      } else {
        memory = {
          content: { text: "[No Content]", hash: mention.id },
          agentId: this.runtime.agentId,
          userId,
          roomId
        };
      }
      await this.handlePublication({
        agent,
        publication: mention,
        memory,
        thread
      });
    }
    this.client.lastInteractionTimestamp = /* @__PURE__ */ new Date();
  }
  async handlePublication({
    agent,
    publication,
    memory,
    thread
  }) {
    if (publication.by.id === agent.id) {
      elizaLogger4.info("skipping cast from bot itself", publication.id);
      return;
    }
    if (!memory.content.text) {
      elizaLogger4.info("skipping cast with no text", publication.id);
      return { text: "", action: "IGNORE" };
    }
    const currentPost = formatPublication(publication);
    const timeline = await this.client.getTimeline(this.profileId);
    const formattedTimeline = formatTimeline(
      this.runtime.character,
      timeline
    );
    function hasContent(metadata) {
      return metadata && typeof metadata.content === "string";
    }
    const formattedConversation = thread.map((pub) => {
      if ("metadata" in pub && hasContent(pub.metadata)) {
        const content = pub.metadata.content;
        return `@${pub.by.handle?.localName} (${new Date(
          pub.createdAt
        ).toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          month: "short",
          day: "numeric"
        })}):
                    ${content}`;
      }
      return `@${pub.by.handle?.localName} (${new Date(
        pub.createdAt
      ).toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric"
      })}):
                [No Content Available]`;
    }).join("\n\n");
    const state = await this.runtime.composeState(memory, {
      lensHandle: agent.handle,
      timeline: formattedTimeline,
      currentPost,
      formattedConversation
    });
    const shouldRespondContext = composeContext2({
      state,
      template: this.runtime.character.templates?.lensShouldRespondTemplate || this.runtime.character?.templates?.shouldRespondTemplate || shouldRespondTemplate
    });
    const memoryId = publicationUuid({
      agentId: this.runtime.agentId,
      pubId: publication.id
    });
    const castMemory = await this.runtime.messageManager.getMemoryById(memoryId);
    if (!castMemory) {
      await this.runtime.messageManager.createMemory(
        createPublicationMemory({
          roomId: memory.roomId,
          runtime: this.runtime,
          publication
        })
      );
    }
    const shouldRespondResponse = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass2.SMALL
    });
    if (shouldRespondResponse === "IGNORE" || shouldRespondResponse === "STOP") {
      elizaLogger4.info(
        `Not responding to publication because generated ShouldRespond was ${shouldRespondResponse}`
      );
      return;
    }
    const context = composeContext2({
      state,
      template: this.runtime.character.templates?.lensMessageHandlerTemplate ?? this.runtime.character?.templates?.messageHandlerTemplate ?? messageHandlerTemplate
    });
    const responseContent = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: ModelClass2.LARGE
    });
    responseContent.inReplyTo = memoryId;
    if (!responseContent.text) return;
    if (this.runtime.getSetting("LENS_DRY_RUN") === "true") {
      elizaLogger4.info(
        `Dry run: would have responded to publication ${publication.id} with ${responseContent.text}`
      );
      return;
    }
    const callback = async (content, _files) => {
      try {
        if (memoryId && !content.inReplyTo) {
          content.inReplyTo = memoryId;
        }
        const result = await sendPublication({
          runtime: this.runtime,
          client: this.client,
          content,
          roomId: memory.roomId,
          commentOn: publication.id,
          ipfs: this.ipfs
        });
        if (!result.publication?.id)
          throw new Error("publication not sent");
        result.memory.content.action = content.action;
        await this.runtime.messageManager.createMemory(result.memory);
        return [result.memory];
      } catch (error) {
        console.error("Error sending response cast:", error);
        return [];
      }
    };
    const responseMessages = await callback(responseContent);
    const newState = await this.runtime.updateRecentMessageState(state);
    await this.runtime.processActions(
      memory,
      responseMessages,
      newState,
      callback
    );
  }
};

// src/providers/StorjProvider.ts
import axios from "axios";
import FormData from "form-data";
var StorjProvider = class {
  STORJ_API_URL = "https://www.storj-ipfs.com";
  STORJ_API_USERNAME;
  STORJ_API_PASSWORD;
  baseURL;
  client;
  constructor(runtime) {
    this.STORJ_API_USERNAME = runtime.getSetting("STORJ_API_USERNAME");
    this.STORJ_API_PASSWORD = runtime.getSetting("STORJ_API_PASSWORD");
    this.baseURL = `${this.STORJ_API_URL}/api/v0`;
    this.client = this.createClient();
  }
  createClient() {
    return axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.STORJ_API_USERNAME,
        password: this.STORJ_API_PASSWORD
      }
    });
  }
  hash(uriOrHash) {
    return typeof uriOrHash === "string" && uriOrHash.startsWith("ipfs://") ? uriOrHash.split("ipfs://")[1] : uriOrHash;
  }
  gatewayURL(uriOrHash) {
    return `${this.STORJ_API_URL}/ipfs/${this.hash(uriOrHash)}`;
  }
  async pinJson(json) {
    if (typeof json !== "string") {
      json = JSON.stringify(json);
    }
    const formData = new FormData();
    formData.append("path", Buffer.from(json, "utf-8").toString());
    const headers = {
      "Content-Type": "multipart/form-data",
      ...formData.getHeaders()
    };
    const { data } = await this.client.post(
      "add?cid-version=1",
      formData.getBuffer(),
      { headers }
    );
    return this.gatewayURL(data.Hash);
  }
  async pinFile(file) {
    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    const response = await this.client.post("add?cid-version=1", formData, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`
      },
      maxContentLength: Number.POSITIVE_INFINITY,
      maxBodyLength: Number.POSITIVE_INFINITY
    });
    return this.gatewayURL(response.data.Hash);
  }
};
var StorjProvider_default = StorjProvider;

// src/index.ts
var LensAgentClient = class {
  constructor(runtime) {
    this.runtime = runtime;
    const cache = /* @__PURE__ */ new Map();
    const privateKey = runtime.getSetting(
      "EVM_PRIVATE_KEY"
    );
    if (!privateKey) {
      throw new Error("EVM_PRIVATE_KEY is missing");
    }
    const account = privateKeyToAccount(privateKey);
    this.profileId = runtime.getSetting(
      "LENS_PROFILE_ID"
    );
    this.client = new LensClient({
      runtime: this.runtime,
      account,
      cache,
      profileId: this.profileId
    });
    elizaLogger5.info("Lens client initialized.");
    this.ipfs = new StorjProvider_default(runtime);
    this.posts = new LensPostManager(
      this.client,
      this.runtime,
      this.profileId,
      cache,
      this.ipfs
    );
    this.interactions = new LensInteractionManager(
      this.client,
      this.runtime,
      this.profileId,
      cache,
      this.ipfs
    );
  }
  client;
  posts;
  interactions;
  profileId;
  ipfs;
  async start() {
    await Promise.all([this.posts.start(), this.interactions.start()]);
  }
  async stop() {
    await Promise.all([this.posts.stop(), this.interactions.stop()]);
  }
};
export {
  LensAgentClient
};
//# sourceMappingURL=index.js.map