import { Actor } from "./Actor";
import { EventEmitter } from "events";
import { Message, Address, Channel, Handler } from "./interfaces";

export type ActorCons<T, U> = new (
    name: string,
    address: Address,
    actorSystem: ActorSystem
) => Actor<T, U>;

export class ActorRef {
    constructor(public address: string, private actorSystem: ActorSystem) {}

    putToMailbox = (
        type: string,
        payload: any,
        senderAddress: Address | null
    ) => {
        this.actorSystem.sendMessage(this, type, payload, senderAddress);
    };

    putQuestionToMailbox = (
        type: string,
        payload: any,
        senderAddress: Address | null
    ): Promise<any> => {
        return this.actorSystem.ask(this, type, payload, senderAddress);
    };

    asTypedActorRef = <T, U>(Class: ActorCons<T, U>) => {
        return new TypedActorRef<T, U>(Class, this.address, this.actorSystem);
    };
}

export class TypedActorRef<T, U> {
    constructor(
        Class: ActorCons<T, U>,
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

    putQuestionToMailbox = <K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<U[K]> => {
        return this.asUntypedActorRef().putQuestionToMailbox(
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
        emitter.on("message", (interActorSystemMessage, cb) => {
            console.log(
                "Got something from the other side",
                interActorSystemMessage
            );
            const actorRef = this.findActor(
                interActorSystemMessage.targetAddress
            );
            if (actorRef) {
                const {
                    mode,
                    type,
                    payload,
                    senderAddress
                } = interActorSystemMessage;
                if (mode === "send") {
                    actorRef.putToMailbox(type, payload, senderAddress);
                } else {
                    actorRef
                        .putQuestionToMailbox(type, payload, senderAddress)
                        .then(message => {
                            cb(message);
                        });
                }
            }
        });
    }
    createActor = <T, U>(name: string, Class: ActorCons<T, U>) => {
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

    sendTypedMessage = <T, U, K extends keyof T & keyof U>(
        Class: ActorCons<T, U>,
        target: ActorRef | TypedActorRef<T, U> | Address,
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ) => {
        const tgt =
            target instanceof TypedActorRef
                ? target.asUntypedActorRef()
                : target;
        this.sendMessage(tgt, type, payload, senderAddress);
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
                mode: "send",
                targetAddress: address,
                senderAddress: senderAddress,
                type: type,
                payload: payload
            });
        }
    };

    askTyped = <T, U, K extends keyof T & keyof U>(
        Class: ActorCons<T, U>,
        target: ActorRef | TypedActorRef<T, U> | Address,
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<U[K]> => {
        const tgt =
            target instanceof TypedActorRef
                ? target.asUntypedActorRef()
                : target;
        return this.ask(tgt, type, payload, senderAddress);
    };

    ask = (
        target: ActorRef | Address,
        type: string,
        payload: any,
        senderAddress: Address | null
    ): Promise<any> => {
        let address;
        if (target instanceof ActorRef) {
            address = target.address;
        } else {
            address = target;
        }

        const actor = this.actorRegistry[address];

        if (actor) {
            console.log("actor found");
            return actor.pushQuestionToMailbox(
                type as any,
                payload,
                senderAddress
            );
        } else if (this.emitter) {
            const emitter = this.emitter;
            return new Promise<any>((resolve, reject) => {
                console.log("trying to reach the other side");
                emitter.emit(
                    "message",
                    {
                        mode: "ask",
                        targetAddress: address,
                        senderAddress: senderAddress,
                        type: type,
                        payload: payload
                    },
                    message => {
                        resolve(message);
                    }
                );
            });
        } else {
            return Promise.reject("Actor not found");
        }
    };
}
