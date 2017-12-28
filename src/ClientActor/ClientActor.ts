import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";

export type ClientActorPayload = {
    greet: { content: string };
    registerCallback: (message: string) => void;
};

export type ClientActorResponse = {
    greet: void;
    registerCallback: void;
};

export class ClientActor extends Actor<
    ClientActorPayload,
    ClientActorResponse
> {
    callback: (message: string) => void;
    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            greet: (payload, senderAddress) => {
                console.log("Client: I received a greeting", payload);
                this.callback(payload.content);
            },
            registerCallback: (callback: (message: string) => void) => {
                console.log("register callback");
                this.callback = callback;
            }
        });

        setTimeout(() => {
            this.sendMessage("serverActor", "greet", {
                content: "hi",
                fn: () => {
                    console.log("sadsadsa");
                },
                other: "adsadsadsa"
            });
        }, 5000);
    }
}
