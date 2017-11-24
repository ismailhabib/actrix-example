import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";

export type ServerActorMessage = { type: "greet"; content: string };

export class ServerActor extends Actor {
  protected handleMessage(message: Message, senderAddress: Address | null) {
    console.log(
      `I received a greeting: ${JSON.stringify(message, null, 4)} from ${
        senderAddress
      }`
    );

    if (senderAddress) {
      this.send(senderAddress, { content: "thanks!" });
    }
  }
}
