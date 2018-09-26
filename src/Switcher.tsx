import * as React from "react";
import {
    ActorSystem,
    ActorRef,
    Actor,
    ValidActorMethodPropNames,
    PayloadPropNames,
    Address,
    promisify,
    CancellablePromise
} from "actrix";

export class Switcher extends React.Component<
    {},
    {
        roomName: RoomName;
        valueFromNaiveImpl: string;
        valueFromBetterImpl: string;
        valueFromActor: string;
    }
> {
    actorSystem: ActorSystem | null = null;

    switcherActor: ActorRef<SwitcherActorAPI>;

    naiveSwitcher: NaiveSwitcherAPI;

    betterSwitcher: BetterSwitcherAPI;

    constructor(props) {
        super(props);
        this.state = {
            roomName: "one",
            valueFromNaiveImpl: "",
            valueFromBetterImpl: "",
            valueFromActor: ""
        };

        this.naiveSwitcher = new NaiveSwitcher();

        this.naiveSwitcher.registerListener(valueFromNaiveImpl => {
            this.setState({ valueFromNaiveImpl });
        });

        this.betterSwitcher = new BetterSwitcher();

        this.betterSwitcher.registerListener(valueFromBetterImpl => {
            this.setState({ valueFromBetterImpl });
        });

        this.switcherActor = new ActorSystem().createActor(
            "mySwitcher",
            SwitcherActor
        );

        this.switcherActor.invoke().registerListener(valueFromActor => {
            this.setState({ valueFromActor });
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
                <div>Naive implementation: {this.state.valueFromNaiveImpl}</div>
                <div>
                    Better implementation: {this.state.valueFromBetterImpl}
                </div>
                <div>Actor implementation: {this.state.valueFromActor}</div>
            </div>
        );
    }

    changeRoom = async event => {
        this.setState({
            roomName: event.target.value,
            valueFromActor: "Loading...",
            valueFromNaiveImpl: "Loading...",
            valueFromBetterImpl: "Loading..."
        });

        this.naiveSwitcher.changeRoom(event.target.value).catch(error => {
            console.log("Changing room failed", error);
        });
        this.betterSwitcher.changeRoom(event.target.value).catch(error => {
            console.log("Changing room failed", error);
        });
        this.switcherActor
            .invoke()
            .changeRoom(event.target.value)
            .catch(error => {
                console.log("Changing room failed", error);
            });
    };
}

type RoomName = "one" | "two" | "three";

type NaiveSwitcherAPI = {
    registerListener: (listener: (value: string) => void) => Promise<void>;
    changeRoom: (roomName: RoomName) => Promise<void>;
};

class NaiveSwitcher implements NaiveSwitcherAPI {
    listener: ((value: string) => void) | undefined;

    openRoom = async roomName => {
        return new Promise<string>((resolve, reject) => {
            setTimeout(() => {
                resolve(`Welcome to room ${roomName}`);
            }, Math.random() * 2000);
        });
    };

    registerListener = async (listener: (value: string) => void) => {
        this.listener = listener;
    };
    changeRoom = async (roomName: RoomName) => {
        const value = await this.openRoom(roomName);
        this.listener && this.listener(value);
    };
}

type BetterSwitcherAPI = {
    registerListener: (listener: (value: string) => void) => Promise<void>;
    changeRoom: (roomName: RoomName) => Promise<void>;
};

class BetterSwitcher implements BetterSwitcherAPI {
    listener: ((value: string) => void) | undefined;

    latestTaskId = 0;

    openRoom = async roomName => {
        this.latestTaskId++;
        const currentTaskId = this.latestTaskId;

        return new Promise<string>((resolve, reject) => {
            setTimeout(() => {
                if (currentTaskId === this.latestTaskId) {
                    resolve(`Welcome to room ${roomName}`);
                } else {
                    reject();
                }
            }, Math.random() * 2000);
        });
    };

    registerListener = async (listener: (value: string) => void) => {
        this.listener = listener;
    };
    changeRoom = async (roomName: RoomName) => {
        const value = await this.openRoom(roomName);
        this.listener && this.listener(value);
    };
}

type SwitcherActorAPI = {
    registerListener: (listener: (value: string) => void) => Promise<void>;
    changeRoom: (roomName: RoomName) => CancellablePromise<void>;
};
class SwitcherActor extends Actor implements SwitcherActorAPI {
    listener: ((value: string) => void) | undefined;

    private openRoom = async roomName => {
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
    private *changeRoomHelper(roomName: RoomName) {
        const value = yield this.openRoom(roomName);
        this.listener && this.listener(value);
    }

    onNewMessage = (type: any, payload: any, senderAddress: Address | null) => {
        if (
            this.currentlyProcessedMessage &&
            this.currentlyProcessedMessage.type === "changeRoom" &&
            type === "changeRoom"
        ) {
            this.cancelCurrentExecution();
        }
    };
}
