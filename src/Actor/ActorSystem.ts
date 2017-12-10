import { Actor } from "./Actor";
import { EventEmitter } from "events";
import { Message, Address, Channel } from "./interfaces";

export class ActorRef {
    constructor(public address: string, private actorSystem: ActorSystem) {}

    putToMailbox = (message: Message, senderAddress: Address | null) => {
        this.actorSystem.sendMessage(this, message, senderAddress);
    };
}
export class ActorSystem {
    private actorRegistry: { [address: string]: Actor<Message> };

    private emitter: Channel | undefined;

    constructor() {
        this.actorRegistry = {};
    }

    listenTo(emitter: Channel) {
        this.emitter = emitter;
        emitter.on("message", interActorSystemMessage => {
            console.log(
                "Got something from the other side",
                interActorSystemMessage
            );
            const actorRef = this.findActor(
                interActorSystemMessage.targetAddress
            );
            if (actorRef) {
                const { message, senderAddress } = interActorSystemMessage;
                actorRef.putToMailbox(message, senderAddress);
            }
        });
    }
    createActor = <T extends Message>(
        name: string,
        Class: new (name: string, actorSystem: ActorSystem) => Actor<T>
    ) => {
        const actor = new Class("name", this);
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

    sendMessage = (
        target: ActorRef | Address,
        message: Message,
        senderAddress: Address | null
    ) => {
        let actor;
        let address;
        if (target instanceof ActorRef) {
            address = target.address;
        } else {
            address = target;
        }

        actor = this.actorRegistry[address];

        if (actor) {
            console.log("actor found");
            actor.pushToMailbox(message, senderAddress);
        } else if (this.emitter) {
            console.log("trying to reach the other side");
            this.emitter.emit("message", {
                targetAddress: address,
                senderAddress: senderAddress,
                message: message
            });
        }
    };
}
