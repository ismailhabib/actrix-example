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
    update: string;
};

export class ChatClientActor extends Actor<ChatClientActorPayload, {}> {
    listener: ((allMessages: ChatMessage[]) => void) | undefined;
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            registerListener: (payload, senderAddress) => {
                this.listener = payload.fn;
            },
            update: (payload, senderAddress) => {
                this.log("Update is coming", payload.messages);
                this.messages = this.messages.concat(payload.messages);
                if (this.listener) {
                    this.listener(this.messages);
                }
            },
            send: (payload, senderAddress) => {
                this.compose()
                    .classType(ChatServerActor)
                    .target(
                        actorSystem.ref({
                            actorSystemName: "server",
                            localAddress: "chatActor"
                        })
                    )
                    .type("post")
                    .payload({ message: payload.message })
                    .send();
            }
        });

        setTimeout(() => {
            this.compose()
                .classType(ChatServerActor)
                .target(
                    actorSystem.ref({
                        actorSystemName: "server",
                        localAddress: "chatActor"
                    })
                )
                .type("subscribe")
                .payload({})
                .send();
        }, 1000);
    }
}
