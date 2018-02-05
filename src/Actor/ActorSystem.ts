import { Actor } from "./Actor";
import { EventEmitter } from "events";
import {
    Message,
    Address,
    Channel,
    Handler,
    InterActorSystemMessage,
    LocalAddress
} from "./interfaces";
import * as uuid from "uuid";

export type ActorCons<T, U> = new (
    name: string,
    address: Address,
    actorSystem: ActorSystem
) => Actor<T, U>;

export class ActorRef {
    constructor(public address: Address, private actorSystem: ActorSystem) {}

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

    typed = <T, U>(Class: ActorCons<T, U>) => {
        return new TypedActorRef<T, U>(Class, this.address, this.actorSystem);
    };
}

export class TypedActorRef<T, U> {
    constructor(
        Class: ActorCons<T, U>,
        public address: Address,
        private actorSystem: ActorSystem
    ) {}

    putToMailbox = <K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ) => {
        return this.untyped().putToMailbox(type, payload, senderAddress);
    };

    putQuestionToMailbox = <K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<U[K]> => {
        return this.untyped().putQuestionToMailbox(
            type,
            payload,
            senderAddress
        );
    };

    untyped = () => {
        return new ActorRef(this.address, this.actorSystem);
    };
}

export class ActorSystem {
    private actorSystemRegistry: { [address: string]: Channel } = {};
    private actorRegistry: { [address: string]: Actor<any, any> };

    name: string;

    constructor(name?: string) {
        this.name = name || uuid.v1();
        this.actorRegistry = {};
    }

    private broadcast(
        event: string,
        msg: InterActorSystemMessage,
        callback?: (message: any) => void
    ) {
        Object.keys(this.actorSystemRegistry).forEach(key =>
            this.actorSystemRegistry[key].emit(event, msg, callback)
        );
    }

    register(emitter: Channel) {
        this.listenTo(emitter);
        this.log("Send a handshake message");
        emitter.emit("message", { mode: "handshake", address: this.name });
    }

    unregister(actorSystemAddress: string) {
        delete this.actorSystemRegistry[actorSystemAddress];
    }

    listenTo(emitter: Channel) {
        let actorSystemAddress: string | undefined = undefined;
        emitter.on("disconnect", () => {
            this.log("Removing listener");
            if (actorSystemAddress) {
                this.unregister(actorSystemAddress);
            }
        });
        emitter.on("message", (interActorSystemMessage, cb) => {
            if (interActorSystemMessage.mode === "handshake") {
                this.log(
                    "Received a handshake message",
                    interActorSystemMessage
                );
                actorSystemAddress = interActorSystemMessage.address;
                this.actorSystemRegistry[actorSystemAddress!] = emitter;
            } else {
                this.log(
                    "Received a message from across the system boundary",
                    interActorSystemMessage
                );
                const actorRef = this.findActor(
                    interActorSystemMessage.targetAddress
                );
                this.log(
                    "The destination address is",
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
                        this.log(
                            `Sending the message to the appropriate actor. Type: ${
                                type
                            }, sender: ${senderAddress}, and payload:`,
                            payload
                        );
                        actorRef.putToMailbox(type, payload, senderAddress);
                    } else {
                        this.log(
                            `Sending the question to the appropriate actor. Type: ${
                                type
                            }, sender: ${senderAddress}, and payload:`,
                            payload
                        );
                        actorRef
                            .putQuestionToMailbox(type, payload, senderAddress)
                            .then(message => {
                                this.log(
                                    `Received an answer, sending the answer "${
                                        message
                                    }" for the question with type: ${
                                        type
                                    }, sender: ${senderAddress}, and payload:`,
                                    payload
                                );
                                cb(message);
                            });
                    }
                } else {
                    this.log("Unable to find the recipient of the message");
                }
            }
        });
    }
    createActor = <T, U>(name: string, Class: ActorCons<T, U>) => {
        this.log(
            `Creating an actor with name: ${name} and type: ${Class.name}`
        );
        const address = name; // TODO: should have a proper mechanism to generate address
        const actor = new Class(
            name,
            { actorSystemName: this.name, localAddress: address },
            this
        );
        this.actorRegistry[address] = actor;
    };

    ref = (address: Address): ActorRef => {
        return new ActorRef(address, this);
    };

    findActor = (address: Address): ActorRef | null => {
        if (address.actorSystemName !== this.name) {
            this.log(
                "This address contains reference to other actor system, you won't find it in this actor system"
            );
            return null;
        }
        const actor = this.actorRegistry[address.localAddress];
        if (actor) {
            return new ActorRef(address, this);
        } else {
            return null;
        }
    };

    sendTypedMessage = <T, U, K extends keyof T & keyof U>(
        Class: ActorCons<T, U>
    ) => (
        target: ActorRef | TypedActorRef<T, U> | Address,
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ) => {
        const tgt = target instanceof TypedActorRef ? target.untyped() : target;
        this.sendMessage(tgt, type, payload, senderAddress);
    };

    sendMessage = (
        target: ActorRef | Address,
        type: string,
        payload: any,
        senderAddress: Address | null
    ) => {
        this.log(
            `Received a request to send a message with type: ${type}`,
            "Target",
            target,
            "Sender",
            senderAddress,
            "Payload",
            payload
        );
        let address: Address;
        if (target instanceof ActorRef) {
            address = target.address;
        } else {
            address = target;
        }

        if (this.isLocalAddress(address)) {
            const actor = this.actorRegistry[address.localAddress];
            if (actor) {
                this.log("Found the actor. Sending the message");
                actor.pushToMailbox(type as any, payload, senderAddress);
            } else {
                this.log("Unable to find the actor. It might have died");
            }
        } else {
            const actorSystemEmitter = this.actorSystemRegistry[
                address.actorSystemName
            ];
            if (actorSystemEmitter) {
                this.log("Found the actor system. Sending the message");
                actorSystemEmitter.emit("message", {
                    mode: "send",
                    targetAddress: address,
                    senderAddress: senderAddress,
                    type: type,
                    payload: payload
                });
            } else {
                this.log("Cannot find the targeted actor system");
            }
        }
    };

    askTyped = <T, U, K extends keyof T & keyof U>(Class: ActorCons<T, U>) => (
        target: ActorRef | TypedActorRef<T, U> | Address,
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<U[K]> => {
        const tgt = target instanceof TypedActorRef ? target.untyped() : target;
        return this.ask(tgt, type, payload, senderAddress);
    };

    ask = (
        target: ActorRef | Address,
        type: string,
        payload: any,
        senderAddress: Address | null
    ): Promise<any> => {
        this.log(
            `Received a request to send a question with type: ${type}`,
            "Target",
            target,
            "Sender",
            senderAddress,
            "Payload",
            payload
        );
        let address: Address;
        if (target instanceof ActorRef) {
            address = target.address;
        } else {
            address = target;
        }

        if (this.isLocalAddress(address)) {
            const actor = this.actorRegistry[address.localAddress];
            if (actor) {
                this.log("Found the actor. Sending the message");
                return actor.pushQuestionToMailbox(
                    type as any,
                    payload,
                    senderAddress
                );
            } else {
                this.log("Unable to find the actor. It might have died");
                return Promise.reject("Actor not found");
            }
        } else {
            const actorSystemEmitter = this.actorSystemRegistry[
                address.actorSystemName
            ];
            if (actorSystemEmitter) {
                return new Promise<any>((resolve, reject) => {
                    this.log("Found the actor system. Sending the message");
                    actorSystemEmitter.emit(
                        "message",
                        {
                            mode: "ask",
                            targetAddress: address,
                            senderAddress: senderAddress,
                            type: type,
                            payload: payload
                        },
                        message => resolve(message)
                    );
                });
            } else {
                this.log("Cannot find the targeted actor system");
                return Promise.reject("ActorSystem not found");
            }
        }
    };

    isLocalAddress(address: Address) {
        return address.actorSystemName === this.name;
    }

    private log(...message: any[]) {
        console.log("ActorSystem: ", ...message);
    }
}
