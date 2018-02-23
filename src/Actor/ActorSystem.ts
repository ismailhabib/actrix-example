import { Actor } from "./Actor";
import { EventEmitter } from "events";
import {
    Message,
    Address,
    Channel,
    Handler,
    InterActorSystemMessage,
    LocalAddress,
    CombinedResponse
} from "./interfaces";
import * as uuid from "uuid";

export type ActorCons<T, U> = new (
    name: string,
    address: Address,
    actorSystem: ActorSystem
) => Actor<T, U>;

export class ActorRef {
    constructor(public address: Address, private actorSystem: ActorSystem) {}

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
                        this.compose()
                            .type(type)
                            .target(actorRef)
                            .payload(payload)
                            .sender(senderAddress!)
                            .send();
                    } else {
                        this.log(
                            `Sending the question to the appropriate actor. Type: ${
                                type
                            }, sender: ${senderAddress}, and payload:`,
                            payload
                        );
                        this.compose()
                            .type(type)
                            .target(actorRef)
                            .payload(payload)
                            .sender(senderAddress!)
                            .ask()
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

    compose = () => {
        return new MessageComposer<any, any, any, any, any>(this);
    };

    sendMessage = (
        target: ActorRef | Address,
        type: string,
        payload: any,
        senderAddress: Address | null
    ): Promise<any> => {
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
                return actor.pushToMailbox(type as any, payload, senderAddress);
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

export class MessageComposer<A, B, C extends string, D, E> {
    constructor(private actorSystem: ActorSystem) {}
    private _classType: ActorCons<A, B> | undefined;
    private _senderAddress: Address | null = null;
    private _targetAddress:
        | Address
        | ActorRef
        | TypedActorRef<A, B>
        | undefined;
    private _payload: D | undefined;
    private _type: C | undefined;
    sender(senderAddress: Address): MessageComposer<A, B, C, D, E> {
        this._senderAddress = senderAddress;
        return this;
    }

    target(target: ActorRef | Address): MessageComposer<A, B, C, D, E> {
        const newInstance = new MessageComposer<A, B, C, D, E>(
            this.actorSystem
        );
        newInstance.copyValuesFrom(this);
        newInstance._targetAddress = target;

        return newInstance;
    }

    targetWithType<V, W>(
        target: TypedActorRef<V, W>
    ): MessageComposer<V, W, C, D, E> {
        const newInstance = new MessageComposer<V, W, C, D, E>(
            this.actorSystem
        );
        newInstance.copyValuesFrom(this);
        newInstance._targetAddress = target;

        return newInstance;
    }

    classType<W, X, Y extends keyof W & keyof X>(
        classType: ActorCons<W, X>
    ): MessageComposer<W, X, Y, any, any> {
        const newInstance = new MessageComposer<W, X, Y, any, any>(
            this.actorSystem
        );
        newInstance.copyValuesFrom(this);
        newInstance._classType = classType;
        return newInstance;
    }

    type<W extends keyof A & keyof CombinedResponse<A, B>>(
        type: W
    ): MessageComposer<A, B, W, A[W], CombinedResponse<A, B>[W]> {
        const newInstance = new MessageComposer<
            A,
            B,
            W,
            A[W],
            CombinedResponse<A, B>[W]
        >(this.actorSystem);
        newInstance.copyValuesFrom(this);
        newInstance._type = type;
        return newInstance;
    }

    payload(payload: D) {
        this._payload = payload;
        return this;
    }

    ask(): Promise<E> {
        if (this._targetAddress && this._payload && this._type) {
            const target =
                this._targetAddress instanceof TypedActorRef
                    ? this._targetAddress.untyped()
                    : this._targetAddress;
            return this.actorSystem.sendMessage(
                target,
                this._type,
                this._payload,
                this._senderAddress
            );
        } else {
            return Promise.reject("Insufficient input");
        }
    }

    send() {
        this.ask();
    }

    copyValuesFrom(source: MessageComposer<any, any, any, any, any>) {
        this._classType = source._classType;
        this._payload = source._payload;
        this._senderAddress = source._senderAddress;
        this._targetAddress = source._targetAddress;
        this._type = source._type;
    }
}
