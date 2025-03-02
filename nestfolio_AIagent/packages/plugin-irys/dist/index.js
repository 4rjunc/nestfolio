// src/services/irysService.ts
import {
  Service,
  ServiceType,
  IrysMessageType,
  generateMessageResponse,
  ModelClass,
  IrysDataType
} from "@elizaos/core";
import { Uploader } from "@irys/upload";
import { BaseEth } from "@irys/upload-ethereum";
import { GraphQLClient, gql } from "graphql-request";
import crypto from "node:crypto";
var IrysService = class extends Service {
  static serviceType = ServiceType.IRYS;
  runtime = null;
  irysUploader = null;
  endpointForTransactionId = "https://uploader.irys.xyz/graphql";
  endpointForData = "https://gateway.irys.xyz";
  async initialize(runtime) {
    console.log("Initializing IrysService");
    this.runtime = runtime;
  }
  async getTransactionId(owners = null, tags = null, timestamp = null) {
    const graphQLClient = new GraphQLClient(this.endpointForTransactionId);
    const QUERY = gql`
            query($owners: [String!], $tags: [TagFilter!], $timestamp: TimestampFilter) {
                transactions(owners: $owners, tags: $tags, timestamp: $timestamp) {
                    edges {
                        node {
                            id,
                            address
                        }
                    }
                }
            }
        `;
    try {
      const variables = {
        owners,
        tags,
        timestamp
      };
      const data = await graphQLClient.request(QUERY, variables);
      const listOfTransactions = data.transactions.edges.map((edge) => edge.node);
      console.log("Transaction IDs retrieved");
      return { success: true, data: listOfTransactions };
    } catch (error) {
      console.error("Error fetching transaction IDs", error);
      return { success: false, data: [], error: "Error fetching transaction IDs" };
    }
  }
  async initializeIrysUploader() {
    if (this.irysUploader) return true;
    if (!this.runtime) return false;
    try {
      const EVM_WALLET_PRIVATE_KEY = this.runtime.getSetting("EVM_WALLET_PRIVATE_KEY");
      if (!EVM_WALLET_PRIVATE_KEY) return false;
      const irysUploader = await Uploader(BaseEth).withWallet(EVM_WALLET_PRIVATE_KEY);
      this.irysUploader = irysUploader;
      return true;
    } catch (error) {
      console.error("Error initializing Irys uploader:", error);
      return false;
    }
  }
  async fetchDataFromTransactionId(transactionId) {
    console.log(`Fetching data from transaction ID: ${transactionId}`);
    const response = await fetch(`${this.endpointForData}/${transactionId}`);
    if (!response.ok) {
      return { success: false, data: null, error: "Error fetching data from transaction ID" };
    }
    return {
      success: true,
      data: response
    };
  }
  converToValues(value) {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return [String(value)];
  }
  async orchestrateRequest(requestMessage, tags, timestamp = null) {
    const serviceCategory = tags.find((tag) => tag.name === "Service-Category")?.values;
    const protocol = tags.find((tag) => tag.name === "Protocol")?.values;
    const minimumProviders = Number(tags.find((tag) => tag.name === "Minimum-Providers")?.values);
    const tagsToRetrieve = [
      { name: "Message-Type", values: [IrysMessageType.DATA_STORAGE] },
      { name: "Service-Category", values: this.converToValues(serviceCategory) },
      { name: "Protocol", values: this.converToValues(protocol) }
    ];
    const data = await this.getDataFromAnAgent(null, tagsToRetrieve, timestamp);
    if (!data.success) {
      return { success: false, data: null, error: data.error };
    }
    const dataArray = data.data;
    for (let i = 0; i < dataArray.length; i++) {
      try {
        const node = dataArray[i];
        const templateRequest = `
                Determine the truthfulness of the relationship between the given context and text.
                Context: ${requestMessage}
                Text: ${node.data}
                Return True or False
                `;
        const responseFromModel = await generateMessageResponse({
          runtime: this.runtime,
          context: templateRequest,
          modelClass: ModelClass.MEDIUM
        });
        console.log("RESPONSE FROM MODEL : ", responseFromModel);
        if (!responseFromModel.success || responseFromModel.content?.toString().toLowerCase().includes("false") && !responseFromModel.content?.toString().toLowerCase().includes("true")) {
          dataArray.splice(i, 1);
          i--;
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("TypeError: Cannot read properties of undefined (reading 'settings')")) {
          return { success: false, data: null, error: "Error in the orchestrator" };
        }
        throw error;
      }
    }
    const responseTags = [
      { name: "Message-Type", values: [IrysMessageType.REQUEST_RESPONSE] },
      { name: "Service-Category", values: [serviceCategory] },
      { name: "Protocol", values: [protocol] },
      { name: "Request-Id", values: [tags.find((tag) => tag.name === "Request-Id")?.values[0]] }
    ];
    if (dataArray.length === 0) {
      const response2 = await this.uploadDataOnIrys("No relevant data found from providers", responseTags, IrysMessageType.REQUEST_RESPONSE);
      console.log("Response from Irys: ", response2);
      return { success: false, data: null, error: "No relevant data found from providers" };
    }
    const listProviders = new Set(dataArray.map((provider) => provider.address));
    if (listProviders.size < minimumProviders) {
      const response2 = await this.uploadDataOnIrys("Not enough providers", responseTags, IrysMessageType.REQUEST_RESPONSE);
      console.log("Response from Irys: ", response2);
      return { success: false, data: null, error: "Not enough providers" };
    }
    const listData = dataArray.map((provider) => provider.data);
    const response = await this.uploadDataOnIrys(listData, responseTags, IrysMessageType.REQUEST_RESPONSE);
    console.log("Response from Irys: ", response);
    return {
      success: true,
      data: listData
    };
  }
  // Orchestrator
  async uploadDataOnIrys(data, tags, messageType, timestamp = null) {
    if (!await this.initializeIrysUploader()) {
      return {
        success: false,
        error: "Irys uploader not initialized"
      };
    }
    const formattedTags = tags.map((tag) => ({
      name: tag.name,
      value: Array.isArray(tag.values) ? tag.values.join(",") : tag.values
    }));
    const requestId = String(crypto.createHash("sha256").update((/* @__PURE__ */ new Date()).toISOString()).digest("hex"));
    formattedTags.push({
      name: "Request-Id",
      value: requestId
    });
    try {
      const dataToStore = {
        data
      };
      const receipt = await this.irysUploader.upload(JSON.stringify(dataToStore), { tags: formattedTags });
      if (messageType === IrysMessageType.DATA_STORAGE || messageType === IrysMessageType.REQUEST_RESPONSE) {
        return { success: true, url: `https://gateway.irys.xyz/${receipt.id}` };
      }
      if (messageType === IrysMessageType.REQUEST) {
        const response = await this.orchestrateRequest(data, tags, timestamp);
        return {
          success: response.success,
          url: `https://gateway.irys.xyz/${receipt.id}`,
          data: response.data,
          error: response.error ? response.error : null
        };
      }
      return { success: true, url: `https://gateway.irys.xyz/${receipt.id}` };
    } catch (error) {
      return { success: false, error: `Error uploading to Irys, ${error}` };
    }
  }
  async uploadFileOrImageOnIrys(data, tags) {
    if (!await this.initializeIrysUploader()) {
      return {
        success: false,
        error: "Irys uploader not initialized"
      };
    }
    const formattedTags = tags.map((tag) => ({
      name: tag.name,
      value: Array.isArray(tag.values) ? tag.values.join(",") : tag.values
    }));
    try {
      const receipt = await this.irysUploader.uploadFile(data, { tags: formattedTags });
      return { success: true, url: `https://gateway.irys.xyz/${receipt.id}` };
    } catch (error) {
      return { success: false, error: `Error uploading to Irys, ${error}` };
    }
  }
  normalizeArrayValues(arr, min, max) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.max(min, max !== void 0 ? Math.min(arr[i], max) : arr[i]);
    }
  }
  normalizeArraySize(arr) {
    if (arr.length === 1) {
      return [arr[0]];
    }
    return arr;
  }
  async workerUploadDataOnIrys(data, dataType, messageType, serviceCategory, protocol, validationThreshold = [], minimumProviders = [], testProvider = [], reputation = []) {
    this.normalizeArrayValues(validationThreshold, 0, 1);
    this.normalizeArrayValues(minimumProviders, 0);
    this.normalizeArrayValues(reputation, 0, 1);
    const tags = [
      { name: "Message-Type", values: [messageType] },
      { name: "Service-Category", values: this.normalizeArraySize(serviceCategory) },
      { name: "Protocol", values: this.normalizeArraySize(protocol) }
    ];
    if (messageType === IrysMessageType.REQUEST) {
      if (validationThreshold.length > 0) {
        tags.push({ name: "Validation-Threshold", values: this.normalizeArraySize(validationThreshold) });
      }
      if (minimumProviders.length > 0) {
        tags.push({ name: "Minimum-Providers", values: this.normalizeArraySize(minimumProviders) });
      }
      if (testProvider.length > 0) {
        tags.push({ name: "Test-Provider", values: this.normalizeArraySize(testProvider) });
      }
      if (reputation.length > 0) {
        tags.push({ name: "Reputation", values: this.normalizeArraySize(reputation) });
      }
    }
    if (dataType === IrysDataType.FILE || dataType === IrysDataType.IMAGE) {
      return await this.uploadFileOrImageOnIrys(data, tags);
    }
    return await this.uploadDataOnIrys(data, tags, messageType);
  }
  async providerUploadDataOnIrys(data, dataType, serviceCategory, protocol) {
    const tags = [
      { name: "Message-Type", values: [IrysMessageType.DATA_STORAGE] },
      { name: "Service-Category", values: serviceCategory },
      { name: "Protocol", values: protocol }
    ];
    if (dataType === IrysDataType.FILE || dataType === IrysDataType.IMAGE) {
      return await this.uploadFileOrImageOnIrys(data, tags);
    }
    return await this.uploadDataOnIrys(data, tags, IrysMessageType.DATA_STORAGE);
  }
  async getDataFromAnAgent(agentsWalletPublicKeys = null, tags = null, timestamp = null) {
    try {
      const transactionIdsResponse = await this.getTransactionId(agentsWalletPublicKeys, tags, timestamp);
      if (!transactionIdsResponse.success) {
        return { success: false, data: null, error: "Error fetching transaction IDs" };
      }
      const transactionIdsAndResponse = transactionIdsResponse.data.map((node) => node);
      const dataPromises = transactionIdsAndResponse.map(async (node) => {
        const fetchDataFromTransactionIdResponse = await this.fetchDataFromTransactionId(node.id);
        if (await fetchDataFromTransactionIdResponse.data.headers.get("content-type") === "application/octet-stream") {
          let data2 = null;
          const responseText = await fetchDataFromTransactionIdResponse.data.text();
          try {
            data2 = JSON.parse(responseText);
          } catch {
            data2 = responseText;
          }
          return {
            data: data2,
            address: node.address
          };
        }
        return {
          data: fetchDataFromTransactionIdResponse.data.url,
          address: node.address
        };
      });
      const data = await Promise.all(dataPromises);
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null, error: `Error fetching data from transaction IDs ${error}` };
    }
  }
};
var irysService_default = IrysService;

// src/index.ts
var irysPlugin = {
  name: "plugin-irys",
  description: "Store and retrieve data on Irys to create a decentralized knowledge base and enable multi-agent collaboration",
  actions: [],
  providers: [],
  evaluators: [],
  clients: [],
  services: [new irysService_default()]
};
var index_default = irysPlugin;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map