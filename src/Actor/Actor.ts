import {
    ActorSystem,
    ActorCons,
    TypedActorRef,
    MessageComposer
} from "./ActorSystem";
import { Address, Handler, CombinedResponse } from "./interfaces";

type MailBoxMessage<T, U, V> = {
    type: T;
    payload: U;
    senderAddress: Address | null;
    callback?: (error?: any, result?: V) => void;
};

export abstract class Actor<T, U> {
    protected name: string;
    private mailBox: MailBoxMessage<
        keyof T & keyof CombinedResponse<T, U>,
        T[keyof T & keyof CombinedResponse<T, U>],
        CombinedResponse<T, U>[keyof CombinedResponse<T, U>]
    >[] = [];
    private timerId: number | null;

    constructor(
        name: string,
        private address: Address,
        private actorSystem: ActorSystem,
        private handlers: Handler<T, CombinedResponse<T, U>>
    ) {
        this.name = name;
        this.timerId = null;
    }

    protected compose = () => {
        return this.actorSystem.compose().sender(this.address);
    };

    protected sendToSelf = <K extends keyof T & keyof CombinedResponse<T, U>>(
        type: K,
        payload: T[K],
        delay?: number
    ) => {
        setTimeout(() => {
            this.pushToMailbox(type, payload, this.address);
        }, delay || 0);
    };

    pushToMailbox = <K extends keyof T & keyof CombinedResponse<T, U>>(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<CombinedResponse<T, U>[K]> => {
        return new Promise<CombinedResponse<T, U>[K]>((resolve, reject) => {
            this.mailBox.push({
                type,
                payload,
                senderAddress,
                callback: (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result as CombinedResponse<T, U>[K]);
                    }
                }
            });
            this.scheduleNextTick();
        });
    };

    ref = (address: Address) => {
        return this.actorSystem.ref(address);
    };

    protected log(...message: any[]) {
        console.log(`${this.name}:`, ...message);
    }

    private async handleMessage<
        K extends keyof T & keyof CombinedResponse<T, U>
    >(
        type: K,
        payload: T[K],
        senderAddress: Address | null
    ): Promise<CombinedResponse<T, U>[K]> {
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
