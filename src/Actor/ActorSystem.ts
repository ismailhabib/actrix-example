import { Actor } from "./Actor";
import { EventEmitter } from "events";
import {
    Message,
    Address,
    Channel,
    Handler,
    InterActorSystemMessage
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

    asTypedActorRef = <T, U>(Class: ActorCons<T, U>) => {
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

    private emitters: Channel[] = [];

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
        this.emitters.forEach(emitter => emitter.emit(event, msg, callback));
    }

    listenTo(emitter: Channel) {
        this.emitters.push(emitter);
        emitter.on("disconnect", () => {
            this.log("Removing listener");
            const index = this.emitters.indexOf(emitter);
            if (index > -1) {
                this.emitters = this.emitters.splice(index, 1);
            }
        });
        emitter.on("message", (interActorSystemMessage, cb) => {
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

    // findActor = (address: Address): ActorRef | null => {
    //     const actor = this.actorRegistry[address];
    //     if (actor) {
    //         return new ActorRef(address, this);
    //     } else {
    //         return null;
    //     }
    // };
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

        const actor = this.actorRegistry[address.localAddress];

        if (actor) {
            this.log("Found the actor. Sending the message");
            actor.pushToMailbox(type as any, payload, senderAddress);
        } else if (this.emitters) {
            this.log(
                "Cannot find the actor locally, will try to send it to the other side"
            );
            this.broadcast("message", {
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

        const actor = this.actorRegistry[address.localAddress];

        if (actor) {
            this.log("Found the actor. Sending the question");
            return actor.pushQuestionToMailbox(
                type as any,
                payload,
                senderAddress
            );
        } else if (this.emitters) {
            this.log(
                "Cannot find the actor locally, will try to send it to the other side"
            );
            const emitter = this.emitters;
            return new Promise<any>((resolve, reject) => {
                this.broadcast(
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

    private log(...message: any[]) {
        console.log("ActorSystem: ", ...message);
    }
}
