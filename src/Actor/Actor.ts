import { ActorSystem, ActorRef, ActorCons, TypedActorRef } from "./ActorSystem";
import { Address, Handler } from "./interfaces";

type MailBoxMessage<T, U, V> = {
    type: T;
    payload: U;
    senderAddress: Address | null;
    callback?: (error?: any, result?: V) => void;
};

export abstract class Actor<T, U> {
    protected name: string;
    private mailBox: MailBoxMessage<
        keyof T & keyof U,
        T[keyof T & keyof U],
        U[keyof U]
    >[] = [];
    private timerId: number | null;

    constructor(
        name: string,
        private address: Address,
        private actorSystem: ActorSystem,
        private handlers: Handler<T, U>
    ) {
        this.name = name;
        this.timerId = null;
    }

    /**
     * Send adds a message to the mailbox of this actor, but does not await the result.
     * If you need the result of handling the message, use `ask`
     */
    pushToMailbox = <K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ) => {
        this.mailBox.push({
            type,
            payload,
            senderAddress
        });
        this.scheduleNextTick();
    };

    sendTypedMessage = <V, W, X extends keyof V & keyof W>(
        Class: ActorCons<V, W>,
        target: TypedActorRef<V, W> | ActorRef | Address,
        type: X,
        payload: V[X],
        senderAddress: Address | null
    ) => {
        const tgt =
            target instanceof TypedActorRef
                ? target.asUntypedActorRef()
                : target;
        this.sendMessage(tgt, type, payload);
    };

    sendMessage = (target: ActorRef | Address, type: string, payload: any) => {
        this.actorSystem.sendMessage(target, type, payload, this.address);
    };

    /**
     * Sends a message to the mailbox of this actor, and returns a Promise which can be used
     * to inspect the result. Use `send` if fire-and-forget semantics suffice
     */
    pushQuestionToMailbox = <K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<U[K]> => {
        return new Promise((resolve, reject) => {
            this.mailBox.push({
                type,
                payload,
                senderAddress,
                callback: (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            });
            this.scheduleNextTick();
        });
    };

    protected async handleMessage<K extends keyof T & keyof U>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<U[K]> {
        return this.handlers[type](payload, senderAddress);
    }

    private scheduleNextTick = () => {
        if (!this.timerId) {
            this.timerId = setImmediate(this.executeTick);
        }
    };

    private executeTick = async () => {
        // Note: if message drop semantics are added; make sure to call any pending callbacks with error!
        const mail = this.mailBox.shift();
        if (!mail) {
            // this is semantically impossible situation, but typescript doesn't know.
            return;
        }
        let success = false;
        let result: any;
        try {
            const { type, payload, senderAddress } = mail;
            result = await this.handleMessage(type, payload, senderAddress);
            success = true;
        } catch (ex) {
            if (!mail.callback) {
                console.error(
                    `Actor ${
                        this.name
                    } failed to handle a message ${JSON.stringify(
                        mail.payload
                    )}`,
                    ex
                );
            } else {
                result = ex;
            }
        }
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        if (this.mailBox.length) {
            this.scheduleNextTick();
        }
        if (mail.callback) {
            mail.callback(
                success ? undefined : result,
                success ? result : undefined
            );
        }
    };
}
