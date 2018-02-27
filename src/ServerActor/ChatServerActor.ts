import { Actor } from "../Actor/Actor";
import { Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ChatClientActor } from "../ClientActor/ChatClientActor";
import deepEqual = require("deep-equal");

export type ChatActorPayload = {
    subscribe: (payload: { userName: string }) => void;
    unsubscribe: (payload: { address: Address; name: string }) => void;
    post: (payload: { message: string }) => void;
};

export type ChatMessage = {
    message: string;
    userAddress: Address;
    userName: string;
};

export class ChatServerActor extends Actor<ChatActorPayload> {
    subscribers: { userName: string; address: Address }[] = [];
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            subscribe: payload => {
                const senderRef = this.currentContext.senderRef;
                this.log(`Subscribe request from ${senderRef}`);
                this.subscribers.push({
                    userName: payload.userName,
                    address: senderRef!.address!
                });
                this.at(senderRef!.classType(ChatClientActor)).update({
                    messages: this.messages
                });
            },
            unsubscribe: payload => {
                const senderAddress = this.currentContext.senderAddress;
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
            post: payload => {
                const senderAddress = this.currentContext.senderAddress;

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
                    this.at(
                        this.ref(subscriber.address).classType(ChatClientActor)
                    ).update({ messages: [newMessage] });
                });
            }
        });
    }
}
