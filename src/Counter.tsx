import * as React from "react";
import { Actor, ActorRef, ActorSystem, Listener } from "actrix";

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
        this.naiveCounter = new NaiveCounter(number => {
            this.setState({ naiveCounter: number });
        });
        this.actorCounter = new ActorSystem().createActor({
            name: "myCounter",
            actorClass: CounterActor,
            paramOptions: number => {
                this.setState({ actorCounter: number });
            }
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
    increment: () => Promise<void>;
};

class NaiveCounter implements CounterAPI {
    counter = 0;
    listener: Listener<number> | undefined;
    constructor(listener: Listener<number>) {
        this.listener = listener;
    }
    increment = async () => {
        this.counter = await asyncInc(this.counter);
        this.listener && this.listener(this.counter);
    };
}

class CounterActor extends Actor<Listener<number>> implements CounterAPI {
    counter = 0;
    listener: Listener<number> | undefined;
    init(listener: Listener<number>) {
        this.listener = listener;
    }
    increment = async () => {
        this.counter = await asyncInc(this.counter);
        this.listener && this.listener(this.counter);
    };
}
