import { Actor } from "./Actor";
import { EventEmitter } from "events";
import { Message, Address, Channel } from "./interfaces";

export class ActorRef {
  constructor(public address: string, private actorSystem: ActorSystem) {}

  send = (message: Message) => {
    this.actorSystem.sendMessage(this, message);
  };
}
export class ActorSystem {
  private actorRegistry: { [address: string]: Actor };

  private emitter: Channel | undefined;

  constructor() {
    this.actorRegistry = {};
  }

  listenTo(emitter: Channel) {
    this.emitter = emitter;
    emitter.on("message", interActorSystemMessage => {
      console.log("Got something from the other side", interActorSystemMessage);
      const actorRef = this.findActor(interActorSystemMessage.targetAddress);
      if (actorRef) {
        actorRef.send(interActorSystemMessage.message);
      }
    });
  }

  createActor = (name: string, Class: new (name: string) => Actor) => {
    const actor = new Class("name");
    const address = name;
    this.actorRegistry[address] = actor;
  };

  findActor = (address: Address): ActorRef | null => {
    const actor = this.actorRegistry[address];
    if (actor) {
      return new ActorRef(address, this);
    } else {
      return null;
    }
  };

  sendMessage = (target: ActorRef | Address, message: Message) => {
    let actor;
    let address;
    if (target instanceof ActorRef) {
      address = target.address;
    } else {
      address = target;
    }

    actor = this.actorRegistry[address];

    if (actor) {
      actor.send(message);
    } else if (this.emitter) {
      console.log("trying to reach the other side");
      this.emitter.emit("message", {
        targetAddress: address,
        message: message
      });
    }
  };
}
