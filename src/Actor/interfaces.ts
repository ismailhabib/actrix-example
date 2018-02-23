export type Message = {};

export type ActorSystemAdress = string;
export type LocalAddress = string;
export type Address = {
    actorSystemName: ActorSystemAdress;
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
        event: "message" | "disconnect" | "reconnect",
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

export type InterActorSystemMessage =
    | {
          mode: "send" | "ask";
          type: string;
          payload: {};
          targetAddress: Address;
          senderAddress: Address | null;
      }
    | {
          mode: "handshake";
          address: string;
      };

export type DefaultResponse<T, U> = { [P in Exclude<keyof T, keyof U>]: void };
export type CombinedResponse<T, U> = DefaultResponse<T, U> & U;
