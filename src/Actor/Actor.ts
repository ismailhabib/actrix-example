import { ActorSystem, ActorCons, TypedActorRef } from "./ActorSystem";
import { Address, Handler, BaseActorDefinition } from "./interfaces";

type MailBoxMessage<T> = {
    type: T;
    payload: any;
    senderAddress: Address | null;
    callback?: (error?: any, result?: any) => void;
};

export abstract class Actor<T extends BaseActorDefinition> {
    protected name: string;
    private mailBox: MailBoxMessage<keyof T>[] = [];
    private timerId: number | null;
    protected currentContext: {
        senderAddress: Address | null;
        senderRef: TypedActorRef<any> | null;
    } = {
        senderAddress: null,
        senderRef: null
    };
    constructor(
        name: string,
        private address: Address,
        private actorSystem: ActorSystem,
        private handlers: Handler<T>
    ) {
        this.name = name;
        this.timerId = null;
    }

    at<A extends BaseActorDefinition>(targetRef: TypedActorRef<A> | Address) {
        return new Proxy(
            {},
            {
                get: (target, prop, receiver) => {
                    return payload =>
                        this.actorSystem.sendMessage(
                            targetRef,
                            prop as any,
                            payload,
                            this.address
                        );
                }
            }
        ) as Handler<A>;
    }

    pushToMailbox = <K extends keyof T>(
        type: K,
        payload: any,
        senderAddress: Address | null
    ): Promise<any> => {
        return new Promise<any>((resolve, reject) => {
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

    // TODO: 'ref' vs 'at' will confuse people
    ref = (address: Address) => {
        return this.actorSystem.ref(address);
    };

    protected log(...message: any[]) {
        console.log(`${this.name}:`, ...message);
    }

    private async handleMessage<K extends keyof T>(
        type: K,
        payload: any
    ): Promise<any> {
        return (this.handlers[type] as any)(payload);
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

            this.currentContext = {
                senderAddress,
                senderRef: senderAddress ? this.ref(senderAddress) : null
            };
            result = await this.handleMessage(type, payload);
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
