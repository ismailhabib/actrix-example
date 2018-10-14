import * as React from "react";
import {
    ActorSystem,
    ActorRef,
    Actor,
    ValidActorMethodPropNames,
    PayloadPropNames,
    Address,
    promisify,
    CancellablePromise,
    Listener
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

        this.naiveSwitcher = new NaiveSwitcher(valueFromNaiveImpl => {
            this.setState({ valueFromNaiveImpl });
        });

        this.betterSwitcher = new BetterSwitcher(valueFromBetterImpl => {
            this.setState({ valueFromBetterImpl });
        });

        this.switcherActor = new ActorSystem().createActor({
            name: "mySwitcher",
            actorClass: SwitcherActor,
            strategies: ["IgnoreOlderMessageWithTheSameType"],
            paramOptions: valueFromActor => {
                this.setState({ valueFromActor });
            }
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
        this.switcherActor.send().changeRoom(event.target.value);
    };
}

type RoomName = "one" | "two" | "three";

type NaiveSwitcherAPI = {
    changeRoom: (roomName: RoomName) => Promise<void>;
};

class NaiveSwitcher implements NaiveSwitcherAPI {
    listener: Listener<string> | undefined;

    constructor(listener: Listener<string>) {
        this.listener = listener;
    }

    openRoom = async roomName => {
        return new Promise<string>((resolve, reject) => {
            setTimeout(() => {
                resolve(`Welcome to room ${roomName}`);
            }, Math.random() * 2000);
        });
    };

    changeRoom = async (roomName: RoomName) => {
        const value = await this.openRoom(roomName);
        this.listener && this.listener(value);
    };
}

type BetterSwitcherAPI = {
    changeRoom: (roomName: RoomName) => Promise<void>;
};

class BetterSwitcher implements BetterSwitcherAPI {
    listener: Listener<string> | undefined;

    latestTaskId = 0;

    constructor(listener: Listener<string>) {
        this.listener = listener;
    }
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

    changeRoom = async (roomName: RoomName) => {
        const value = await this.openRoom(roomName);
        this.listener && this.listener(value);
    };
}

type SwitcherActorAPI = {
    changeRoom: (roomName: RoomName) => CancellablePromise<void>;
};
class SwitcherActor extends Actor<Listener<string>>
    implements SwitcherActorAPI {
    listener: Listener<string> | undefined;

    private openRoom = async roomName => {
        return new Promise<string>((resolve, reject) => {
            setTimeout(() => {
                resolve(`Welcome to room ${roomName}`);
            }, Math.random() * 2000);
        });
    };
    init(listener: Listener<string>) {
        this.listener = listener;
    }

    changeRoom = promisify(this.changeRoomHelper);
    private *changeRoomHelper(roomName: RoomName) {
        const value = yield this.openRoom(roomName);
        this.listener && this.listener(value);
    }
}
