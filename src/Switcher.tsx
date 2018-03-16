import * as React from "react";
import { ActorSystem } from "./Actor/ActorSystem";
import { ActorRef, Actor } from "./Actor/Actor";
import { Address } from "./Actor/interfaces";
import { promisify } from "./Actor/Utils";

export class Switcher extends React.Component<
    {},
    { roomName: RoomName; value: string }
> {
    actorSystem: ActorSystem | null = null;

    switcherActor: ActorRef<SwitcherActorAPI>;

    constructor(props) {
        super(props);
        this.state = { roomName: "one", value: "" };

        this.switcherActor = new ActorSystem().createActor(
            "mySwitcher",
            SwitcherActor
        );

        this.switcherActor.invoke().registerListener(value => {
            this.setState({ value });
        });
    }
    render() {
        return (
            <div>
                <input
                    type="radio"
                    value="one"
                    name="Room"
                    onChange={this.changeRoom}
                    checked={this.state.roomName === "one"}
                />
                One
                <input
                    type="radio"
                    value="two"
                    name="Room"
                    onChange={this.changeRoom}
                    checked={this.state.roomName === "two"}
                />
                Two
                <input
                    type="radio"
                    value="three"
                    name="Room"
                    onChange={this.changeRoom}
                    checked={this.state.roomName === "three"}
                />
                Three
                <div>&nbsp;</div>
                <div>{this.state.value}</div>
            </div>
        );
    }

    changeRoom = event => {
        this.setState({ roomName: event.target.value, value: "Loading..." });
        this.switcherActor.invoke().changeRoom(event.target.value);
    };
}

type RoomName = "one" | "two" | "three";

type SwitcherActorAPI = {
    registerListener: (listener: (value: string) => void) => Promise<void>;
    changeRoom: (roomName: RoomName) => Promise<void>;
};

class SwitcherActor extends Actor implements SwitcherActorAPI {
    listener: ((value: string) => void) | undefined;

    openRoom = async roomName => {
        return new Promise<string>((resolve, reject) => {
            const openRoomMsg = this.mailBox.find(
                mail => mail.type === "openRoom"
            );
            if (openRoomMsg) {
                reject();
            }
            setTimeout(() => {
                resolve(`Welcome to room ${roomName}`);
            }, Math.random() * 2000);
        });
    };
    registerListener = async (listener: (value: string) => void) => {
        this.listener = listener;
    };

    changeRoom = promisify(this.changeRoomHelper);
    *changeRoomHelper(roomName: RoomName) {
        const value = yield this.openRoom(roomName);
        this.listener && this.listener(value);
    }

    onNewMessage = <K extends keyof this>(
        type: K,
        payload: any,
        senderAddress: Address | null
    ) => {
        if (
            this.currentlyProcessedMessage &&
            this.currentlyProcessedMessage.type === "changeRoom" &&
            type === "changeRoom"
        ) {
            this.cancelCurrentExecution();
        }
    };
}
