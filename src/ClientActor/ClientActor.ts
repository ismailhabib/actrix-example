import { Actor } from "../Actor/Actor";
import { Message, Address } from "../Actor/interfaces";

export type ClientActorMessage = { type: "greet"; content: string };

export class ClientActor extends Actor<ClientActorMessage> {
  protected handleMessage(message: Message, senderAddress: Address | null) {
    console.log("Client: I received a greeting", message);
  }
}
