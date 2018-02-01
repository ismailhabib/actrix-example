import { Actor } from "../Actor/Actor";
import { Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ChatMessage, ChatServerActor } from "../ServerActor/ChatServerActor";
import { setTimeout } from "timers";

export type ChatClientActorPayload = {
    registerListener: { fn: (allMessages: ChatMessage[]) => void };
    send: { message: string };
    update: { messages: ChatMessage[] };
};

export type ChatClientActorResponse = {
    registerListener: void;
    send: void;
    update: void;
};

export class ChatClientActor extends Actor<
    ChatClientActorPayload,
    ChatClientActorResponse
> {
    listener: (allMessages: ChatMessage[]) => void | null;
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            registerListener: (payload, senderAddress) => {
                this.listener = payload.fn;
            },
            update: (payload, senderAddress) => {
                this.log("Update is coming", payload.messages);
                this.messages = this.messages.concat(payload.messages);
                this.listener(this.messages);
            },
            send: (payload, senderAddress) => {
                this.sendTypedMessage(ChatServerActor)(
                    { actorSystemName: "server", localAddress: "chatActor" },
                    "post",
                    {
                        message: payload.message
                    }
                );
            }
        });

        setTimeout(() => {
            this.sendTypedMessage(ChatServerActor)(
                { actorSystemName: "server", localAddress: "chatActor" },
                "subscribe",
                {}
            );
        }, 1000);
    }
}
