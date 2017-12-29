import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";
import { ClientActor } from "../ClientActor/ClientActor";

export type ServerActorPayload = {
    greet: { content: string };
    whoAreYou: {};
    askActor: { address: Address };
};
export type ServerActorResponse = {
    greet: void;
    whoAreYou: string;
    askActor: void;
};

export class ServerActor extends Actor<
    ServerActorPayload,
    ServerActorResponse
> {
    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            greet: (
                payload: ServerActorPayload[keyof ServerActorPayload],
                senderAddress: Address | null
            ) => {
                this.log(
                    `I received a greeting: ${JSON.stringify(
                        payload,
                        null,
                        4
                    )} from ${senderAddress}`
                );

                if (senderAddress) {
                    this.sendMessage(senderAddress, "greet", {
                        content: "thanks!"
                    });
                }
            },
            whoAreYou: (payload, senderAddress) => {
                this.log("Who am I you said?");
                this.sendToSelf("askActor", { address: senderAddress! });
                return "I am the ServerActor";
            },
            askActor: async (payload, senderAddress) => {
                const theOtherActorName = await this.askTyped(
                    ClientActor,
                    payload.address,
                    "whoAreYou",
                    {}
                );
                this.log(
                    "The one who send me message earlier is ",
                    theOtherActorName
                );
            }
        });
    }
}
