import { Actor } from "./Actor";
import { EventEmitter } from "events";
import { Message, Address, Channel, Handler } from "./interfaces";

export class ActorRef {
    constructor(public address: string, private actorSystem: ActorSystem) {}

    putToMailbox = (
        type: string,
        payload: any,
        senderAddress: Address | null
    ) => {
        this.actorSystem.sendMessage(this, type, payload, senderAddress);
    };

    asTypedActorRef = <T, U>(
        Class: new (
            name: string,
            address: Address,
            actorSystem: ActorSystem
        ) => Actor<T, U>
    ) => {
        return new TypedActorRef<T, U>(Class, this.address, this.actorSystem);
    };
}

export class TypedActorRef<T, U> {
    constructor(
        Class: new (
            name: string,
            address: Address,
            actorSystem: ActorSystem
        ) => Actor<T, U>,
        public address: string,
        private actorSystem: ActorSystem
    ) {}

    putToMailbox = <K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ) => {
        return this.asUntypedActorRef().putToMailbox(
            type,
            payload,
            senderAddress
        );
    };

    asUntypedActorRef = () => {
        return new ActorRef(this.address, this.actorSystem);
    };
}
export class ActorSystem {
    private actorRegistry: { [address: string]: Actor<any, any> };

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
                const {
                    type,
                    payload,
                    senderAddress
                } = interActorSystemMessage;
                actorRef.putToMailbox(type, payload, senderAddress);
            }
        });
    }
    createActor = <T, U>(
        name: string,
        Class: new (
            name: string,
            address: Address,
            actorSystem: ActorSystem
        ) => Actor<T, U>
    ) => {
        const address = name; // should have a proper mechanism to generate address
        const actor = new Class(name, address, this);
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
        type: string,
        payload: any,
        senderAddress: Address | null
    ) => {
        let address;
        if (target instanceof ActorRef) {
            address = target.address;
        } else {
            address = target;
        }

        const actor = this.actorRegistry[address];

        if (actor) {
            console.log("actor found");
            actor.pushToMailbox(type as any, payload, senderAddress);
        } else if (this.emitter) {
            console.log("trying to reach the other side");
            this.emitter.emit("message", {
                targetAddress: address,
                senderAddress: senderAddress,
                type: type,
                payload: payload
            });
        }
    };

    // TODO: doesn't support ask via websocket yet, implementation is not done
    ask = (
        target: ActorRef | Address,
        type: string,
        payload: {},
        senderAddress: Address | null
    ) => {
        let address;
        if (target instanceof ActorRef) {
            address = target.address;
        } else {
            address = target;
        }

        const actor = this.actorRegistry[address];

        if (actor) {
            console.log("actor found");
            actor.pushQuestionToMailbox(type as any, payload, senderAddress);
        } else if (this.emitter) {
            console.log("trying to reach the other side");
            this.emitter.emit("message", {
                targetAddress: address,
                senderAddress: senderAddress,
                type: type,
                payload: payload
            });
        }
    };
}
