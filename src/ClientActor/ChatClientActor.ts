import { Actor } from "../Actor/Actor";
import { Address, BaseActorDefinition, Handler } from "../Actor/interfaces";
import { ActorSystem, TypedActorRef } from "../Actor/ActorSystem";
import {
    ChatMessage,
    ChatServerActor,
    ChatServerActorAPI
} from "../ServerActor/ChatServerActor";
import { setTimeout } from "timers";

export type ChatClientActorAPI = {
    registerListener: (
        payload: { fn: (allMessages: ChatMessage[]) => void }
    ) => Promise<void>;
    send: (payload: { message: string }) => Promise<void>;
    update: (payload: { messages: ChatMessage[] }) => Promise<void>;
    connect: (payload: { userName: string }) => Promise<void>;
};

export class ChatClientActor extends Actor implements ChatClientActorAPI {
    listener: ((allMessages: ChatMessage[]) => void) | undefined;
    messages: ChatMessage[] = [];

    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem);
    }

    registerListener = async payload => {
        this.listener = payload.fn;
    };

    update = async payload => {
        this.log("Update is coming", payload.messages);
        this.messages = this.messages.concat(payload.messages);
        if (this.listener) {
            this.listener(this.messages);
        }
    };

    send = async payload => {
        this.at(
            this.ref({
                actorSystemName: "server",
                localAddress: "chatActor"
            }).classType<ChatServerActorAPI>()
        ).post({ message: payload.message });
    };

    connect = async payload => {
        this.log("Connecting");
        this.at(
            this.ref({
                actorSystemName: "server",
                localAddress: "chatActor"
            }).classType<ChatServerActorAPI>()
        ).subscribe(payload);
    };
}
