import { Actor } from "../Actor/Actor";
import { Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ChatClientActor } from "../ClientActor/ChatClientActor";

export type ChatActorPayload = {
    subscribe: {};
    unsubscribe: { address: Address };
    post: { message: string };
};

export type ChatActorResponse = {
    subscribe: void;
    unsubscribe: void;
    post: void;
};

export type ChatMessage = {
    message: string;
    user: string;
};
export class ChatActor extends Actor<ChatActorPayload, ChatActorResponse> {
    subscribers: Address[] = [];
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            subscribe: (payload, senderAddress) => {
                this.log(`Subscribe request from ${senderAddress}`);
                this.subscribers.push(senderAddress!);
                this.sendTypedMessage(
                    ChatClientActor,
                    senderAddress!,
                    "update",
                    { messages: this.messages }
                );
            },
            unsubscribe: (payload, senderAddress) => {
                this.log(
                    `Request from ${senderAddress} for unsubscribing ${
                        payload.address
                    }`
                );
                const index = this.subscribers.indexOf(payload.address);
                if (index > -1) {
                    this.subscribers = this.subscribers.splice(index, 1);
                }
            },
            post: (payload, senderAddress) => {
                this.log(
                    `New message from ${senderAddress}: ${payload.message}`
                );
                const newMessage: ChatMessage = {
                    user: senderAddress!,
                    message: payload.message
                };
                this.messages.push(newMessage);
                this.subscribers.forEach(subscriber => {
                    this.sendTypedMessage(
                        ChatClientActor,
                        subscriber,
                        "update",
                        { messages: [newMessage] }
                    );
                });
            }
        });
    }
}
