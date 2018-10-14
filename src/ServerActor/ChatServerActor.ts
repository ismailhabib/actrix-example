import { Actor, ActorRef, Address, ActorSystem } from "actrix";
import { ChatClientActorAPI } from "../ClientActor/ChatClientActor";
import deepEqual = require("deep-equal");

export type ChatServerActorAPI = {
    subscribe: (payload: { userName: string }) => Promise<void>;
    unsubscribe: (payload: { address: Address; name: string }) => Promise<void>;
    post: (payload: { message: string }) => Promise<void>;
};

export type ChatMessage = {
    message: string;
    userAddress: Address;
    userName: string;
};

export class ChatServerActor extends Actor implements ChatServerActorAPI {
    private subscribers: { userName: string; address: Address }[] = [];
    private messages: ChatMessage[] = [];

    subscribe = async payload => {
        const senderRef: ActorRef<ChatClientActorAPI> = this.context.senderRef!;
        this.log(`Subscribe request from ${senderRef}`);
        this.subscribers.push({
            userName: payload.userName,
            address: senderRef!.address!
        });
        this.sendTo(senderRef).update({
            messages: this.messages
        });
    };

    unsubscribe = async payload => {
        const senderAddress = this.context.senderAddress;
        this.log(
            `Request from ${senderAddress} for unsubscribing ${payload.address}`
        );
        const index = this.subscribers.findIndex(subscriber =>
            deepEqual(subscriber.address, payload.address)
        );
        if (index > -1) {
            this.subscribers = this.subscribers.splice(index, 1);
        }
    };

    post = async payload => {
        const senderAddress = this.context.senderAddress;

        this.log(`New message from ${senderAddress}: ${payload.message}`);
        const newMessage: ChatMessage = {
            userAddress: senderAddress!,
            message: payload.message,
            userName: this.subscribers.find(subscriber =>
                deepEqual(subscriber.address, senderAddress)
            )!.userName
        };
        this.messages.push(newMessage);

        this.subscribers.forEach(subscriber => {
            this.sendTo<ChatClientActorAPI>(subscriber.address).update({
                messages: [newMessage]
            });
        });
    };
}
