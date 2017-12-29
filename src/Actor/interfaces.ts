export type Message = {};

// export type Message = { senderAddress: Address; content: MessageContent };
export type Address = string;

export type Handler<T, U> = {
    [P in (keyof T & keyof U)]: (
        val: T[P],
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
