import { Actor } from "../Actor/Actor";
import { Address } from "../Actor/interfaces";
import { ActorSystem, TypedActorRef } from "../Actor/ActorSystem";
import { ChatMessage, ChatServerActor } from "../ServerActor/ChatServerActor";
import { setTimeout } from "timers";

export type ChatClientActorPayload = {
    registerListener: (
        payload: { fn: (allMessages: ChatMessage[]) => void }
    ) => void;
    send: (payload: { message: string }) => void;
    update: (payload: { messages: ChatMessage[] }) => void;
    connect: (payload: { userName: string }) => void;
};

export class ChatClientActor extends Actor<ChatClientActorPayload> {
    listener: ((allMessages: ChatMessage[]) => void) | undefined;
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            registerListener: payload => {
                this.listener = payload.fn;
            },
            update: payload => {
                this.log("Update is coming", payload.messages);
                this.messages = this.messages.concat(payload.messages);
                if (this.listener) {
                    this.listener(this.messages);
                }
            },
            send: payload => {
                this.at(
                    this.ref({
                        actorSystemName: "server",
                        localAddress: "chatActor"
                    }).classType(ChatServerActor)
                ).post({ message: payload.message });
            },
            connect: payload => {
                this.log("Connecting");
                this.at(
                    this.ref({
                        actorSystemName: "server",
                        localAddress: "chatActor"
                    }).classType(ChatServerActor)
                ).subscribe(payload);
            }
        });
    }
}
