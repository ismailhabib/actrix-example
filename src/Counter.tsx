import * as React from "react";
import { Actor, ActorRef, ActorSystem } from "actrix";

async function asyncInc(value: number) {
    return new Promise<number>((resolve, reject) => {
        setTimeout(() => {
            resolve(value + 1);
        }, 200);
    });
}

export class Counter extends React.Component<
    {},
    { syncCounter: number; naiveCounter: number; actorCounter: number }
> {
    naiveCounter: NaiveCounter;
    actorCounter: ActorRef<CounterAPI>;
    constructor(props) {
        super(props);
        this.state = { syncCounter: 0, naiveCounter: 0, actorCounter: 0 };
        this.naiveCounter = new NaiveCounter();
        this.actorCounter = new ActorSystem().createActor({
            name: "myCounter",
            Class: CounterActor
        });

        this.naiveCounter.registerListener(number => {
            this.setState({ naiveCounter: number });
        });
        this.actorCounter.invoke().registerListener(number => {
            this.setState({ actorCounter: number });
        });
    }

    render() {
        return (
            <div>
                <button onClick={this.handleButtonClick}>Increment</button>
                <div>&nbsp;</div>
                <div>Sync counter: {this.state.syncCounter}</div>
                <div>Naive async counter: {this.state.naiveCounter}</div>
                <div>Actor async counter: {this.state.actorCounter}</div>
            </div>
        );
    }

    handleButtonClick = async () => {
        this.setState({ syncCounter: this.state.syncCounter + 1 });
        this.naiveCounter.increment();
        this.actorCounter.invoke().increment();
    };
}

type CounterAPI = {
    registerListener: (listener: (counter: number) => void) => Promise<void>;
    increment: () => Promise<void>;
};

class NaiveCounter implements CounterAPI {
    counter = 0;
    listener: ((counter: number) => void) | undefined;
    registerListener = async (listener: (counter: number) => void) => {
        this.listener = listener;
    };
    increment = async () => {
        this.counter = await asyncInc(this.counter);
        this.listener && this.listener(this.counter);
    };
}

class CounterActor extends Actor implements CounterAPI {
    counter = 0;
    listener: ((counter: number) => void) | undefined;
    registerListener = async (listener: (counter: number) => void) => {
        this.listener = listener;
    };
    increment = async () => {
        this.counter = await asyncInc(this.counter);
        this.listener && this.listener(this.counter);
    };
}
