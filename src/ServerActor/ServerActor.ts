import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";
import { ActorSystem } from "../Actor/ActorSystem";

export type ServerActorPayload = { greet: { content: string } };

export class ServerActor extends Actor<ServerActorPayload, {}> {
    constructor(name: string, address: Address, actorSystem: ActorSystem) {
        super(name, address, actorSystem, {
            greet: (
                payload: ServerActorPayload[keyof ServerActorPayload],
                senderAddress: Address
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
            }
        });
    }
}
