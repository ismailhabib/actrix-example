import { Actor } from "../Actor/Actor";

export type ServerActorMessage = { type: "greet"; content: string };

export class ServerActor extends Actor {
  protected handleMessage(message: {}) {
    console.log("I received a greeting", message);
  }
}
