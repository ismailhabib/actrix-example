import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ServerActor } from "../ServerActor/ServerActor";

export type ClientActorPayload = {
    greet: { content: string };
    registerCallback: (message: string) => void;
    // greetServer: {};
};

export type ClientActorResponse = {
    greet: void;
    registerCallback: void;
    // greetServer: void;
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
            // ,
            // greetServer: (payload, senderAddres) => {
            //     this.askTyped(
            //         ServerActor,
            //         actorSystem.findActor("serverActor")!,
            //         "whoAreYou",
            //         {}
            //     ).then(message => this.callback(message));
            // }
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

        setTimeout(() => {
            this.sendTypedMessage(ServerActor, "serverActor", "whoAreYou", {});
        }, 10000);
    }
}
