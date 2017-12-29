import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ServerActor } from "../ServerActor/ServerActor";

export type ClientActorPayload = {
    greet: { content: string };
    registerCallback: (message: string) => void;
    whoAreYou: {};
    // greetServer: {};
};

export type ClientActorResponse = {
    greet: void;
    registerCallback: void;
    whoAreYou: string;
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
                this.log("I received a greeting", payload);
                this.callback(payload.content);
            },
            registerCallback: (callback: (message: string) => void) => {
                this.log("Register callback");
                this.callback = callback;
            },
            whoAreYou: (payload, senderAddress) => {
                return "I am the Client Actor";
            }
        });

        // setTimeout(() => {
        //     this.log("I am sending serverActor a greet");
        //     this.sendTypedMessage(ServerActor, "serverActor", "greet", {
        //         content: "hi"
        //     });
        // }, 5000);

        // setTimeout(() => {
        //     this.log("I am sending serverActor a question");
        //     this.askTyped(ServerActor, "serverActor", "whoAreYou", {}).then(
        //         message => this.callback(message)
        //     );
        // }, 10000);
    }
}
