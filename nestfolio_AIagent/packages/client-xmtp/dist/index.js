// src/index.ts
import { xmtpClient } from "@xmtp/agent-starter";
import {
  composeContext,
  elizaLogger,
  ModelClass,
  stringToUuid,
  messageCompletionFooter,
  generateMessageResponse
} from "@elizaos/core";
var xmtp = null;
var elizaRuntime = null;
var messageHandlerTemplate = (
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter
);
var XmtpClientInterface = {
  start: async (runtime) => {
    if (!xmtp) {
      elizaRuntime = runtime;
      xmtp = await xmtpClient({
        walletKey: process.env.EVM_PRIVATE_KEY,
        onMessage
      });
      elizaLogger.success("\u2705 XMTP client started");
      elizaLogger.info(`XMTP address: ${xmtp.address}`);
      elizaLogger.info(`Talk to me on:`);
      elizaLogger.log(
        `Converse: https://converse.xyz/dm/${xmtp.address}`
      );
      elizaLogger.log(
        `Coinbase Wallet: https://go.cb-w.com/messaging?address=${xmtp.address}`
      );
      elizaLogger.log(
        `Web or Farcaster Frame: https://client.message-kit.org/?address=${xmtp.address}`
      );
      return xmtp;
    }
    return xmtp;
  },
  stop: async (_runtime) => {
    elizaLogger.warn("XMTP client does not support stopping yet");
  }
};
var onMessage = async (message) => {
  elizaLogger.info(
    `Decoded message: ${message.content?.text ?? "no text"} by ${message.sender.address}`
  );
  try {
    const text = message?.content?.text ?? "";
    const messageId = stringToUuid(message.id);
    const userId = stringToUuid(message.sender.address);
    const roomId = stringToUuid(message.group.id);
    await elizaRuntime.ensureConnection(
      userId,
      roomId,
      message.sender.address,
      message.sender.address,
      "xmtp"
    );
    const content = {
      text,
      source: "xmtp",
      inReplyTo: void 0
    };
    const userMessage = {
      content,
      userId,
      roomId,
      agentId: elizaRuntime.agentId
    };
    const memory = {
      id: messageId,
      agentId: elizaRuntime.agentId,
      userId,
      roomId,
      content,
      createdAt: Date.now()
    };
    await elizaRuntime.messageManager.createMemory(memory);
    const state = await elizaRuntime.composeState(userMessage, {
      agentName: elizaRuntime.character.name
    });
    const context = composeContext({
      state,
      template: messageHandlerTemplate
    });
    const response = await generateMessageResponse({
      runtime: elizaRuntime,
      context,
      modelClass: ModelClass.LARGE
    });
    const _newMessage = [
      {
        text: response?.text,
        source: "xmtp",
        inReplyTo: messageId
      }
    ];
    const responseMessage = {
      ...userMessage,
      userId: elizaRuntime.agentId,
      content: response
    };
    await elizaRuntime.messageManager.createMemory(responseMessage);
    if (!response) {
      elizaLogger.error("No response from generateMessageResponse");
      return;
    }
    await elizaRuntime.evaluate(memory, state);
    const _result = await elizaRuntime.processActions(
      memory,
      [responseMessage],
      state,
      async (newMessages) => {
        if (newMessages.text) {
          _newMessage.push({
            text: newMessages.text,
            source: "xmtp",
            inReplyTo: void 0
          });
        }
        return [memory];
      }
    );
    for (const newMsg of _newMessage) {
      await xmtp.send({
        message: newMsg.text,
        originalMessage: message,
        metadata: {}
      });
    }
  } catch (error) {
    elizaLogger.error("Error in onMessage", error);
  }
};
var index_default = XmtpClientInterface;
export {
  XmtpClientInterface,
  index_default as default,
  messageHandlerTemplate
};
//# sourceMappingURL=index.js.map