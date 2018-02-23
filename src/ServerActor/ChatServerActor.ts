import { Actor } from "../Actor/Actor";
import { Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ChatClientActor } from "../ClientActor/ChatClientActor";
import deepEqual = require("deep-equal");

export type ChatActorPayload = {
    subscribe: { userName: string };
    unsubscribe: { address: Address; name: string };
    post: { message: string };
};

export type ChatMessage = {
    message: string;
    userAddress: Address;
    userName: string;
};

export class ChatServerActor extends Actor<ChatActorPayload, {}> {
    subscribers: { userName: string; address: Address }[] = [];
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            subscribe: (payload, senderAddress) => {
                this.log(`Subscribe request from ${senderAddress}`);
                this.subscribers.push({
                    userName: payload.userName,
                    address: senderAddress!
                });
                this.compose()
                    .target(
                        actorSystem
                            .ref(senderAddress!)
                            .classType(ChatClientActor)
                    )
                    .type("update")
                    .payload({ messages: this.messages })
                    .send();
            },
            unsubscribe: (payload, senderAddress) => {
                this.log(
                    `Request from ${senderAddress} for unsubscribing ${
                        payload.address
                    }`
                );
                const index = this.subscribers.findIndex(subscriber =>
                    deepEqual(subscriber.address, payload.address)
                );
                if (index > -1) {
                    this.subscribers = this.subscribers.splice(index, 1);
                }
            },
            post: (payload, senderAddress) => {
                this.log(
                    `New message from ${senderAddress}: ${payload.message}`
                );
                const newMessage: ChatMessage = {
                    userAddress: senderAddress!,
                    message: payload.message,
                    userName: this.subscribers.find(subscriber =>
                        deepEqual(subscriber.address, senderAddress)
                    )!.userName
                };
                this.messages.push(newMessage);
                this.subscribers.forEach(subscriber => {
                    this.compose()
                        .target(
                            actorSystem
                                .ref(subscriber.address)
                                .classType(ChatClientActor)
                        )
                        .type("update")
                        .payload({ messages: [newMessage] })
                        .send();
                });
            }
        });
    }
}
