export type Message = {};

export type LocalAddress = string;
export type Address = {
    actorSystemName: string;
    localAddress: LocalAddress;
};

export type Handler<T, U> = {
    [P in (keyof T & keyof U)]: (
        payload: T[P],
        senderAddress: Address | null
    ) => U[P]
};

export type Channel = {
    on: (
        event: string,
        fn: (
            message: InterActorSystemMessage,
            callback: (message: any) => void
        ) => void
    ) => void;
    emit: (
        event: string,
        message: InterActorSystemMessage,
        callback?: (message: any) => void
    ) => void;
};

export type InterActorSystemMessage = {
    mode: "send" | "ask";
    type: string;
    payload: {};
    targetAddress: Address;
    senderAddress: Address | null;
};
