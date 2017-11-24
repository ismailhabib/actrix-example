import { Actor } from "../Actor/Actor";

export type ClientActorMessage = { type: "greet"; content: string };

export class ClientActor extends Actor {
  protected handleMessage(message: {}) {
    console.log("Client: I received a greeting", message);
  }
}
