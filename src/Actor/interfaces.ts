export type Message = {};

// export type Message = { senderAddress: Address; content: MessageContent };
export type Address = string;

export type Channel = {
  on: (event: string, fn: (message: InterActorSystemMessage) => void) => void;
  emit: (event: string, message: InterActorSystemMessage) => void;
};

export type InterActorSystemMessage = {
  message: Message;
  targetAddress: Address;
};
