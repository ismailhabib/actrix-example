import { Actor, Address, Handler, ActorSystem } from "actrix";
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
    private listener: ((allMessages: ChatMessage[]) => void) | undefined;
    private messages: ChatMessage[] = [];
    private serverActorRef = this.ref<ChatServerActorAPI>({
        actorSystemName: "server",
        localAddress: "chatActor"
    });

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
        this.sendTo(this.serverActorRef).post({ message: payload.message });
    };

    connect = async payload => {
        this.log("Connecting");
        this.sendTo(this.serverActorRef).subscribe(payload);
    };
}
