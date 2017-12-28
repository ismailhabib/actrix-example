import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";

export type ServerActorPayload = { greet: { content: string }; whoAreYou: {} };
export type ServerActorResponse = { greet: void; whoAreYou: string };

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
                console.log(
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
                return "I am the ServerActor";
            }
        });
    }
}
