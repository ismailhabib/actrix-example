import * as React from "react";
import { Actor, ActorRef } from "./Actor/Actor";
import { ActorSystem } from "./Actor/ActorSystem";

async function asyncInc(value: number) {
    return new Promise<number>((resolve, reject) => {
        setTimeout(() => {
            resolve(value + 1);
        }, 200);
    });
}

export class Counter extends React.Component<
    {},
    { naiveCounter: number; ourCounter: number }
> {
    naiveCounter: NaiveCounter;
    ourCounter: ActorRef<CounterAPI>;
    constructor(props) {
        super(props);
        this.state = { naiveCounter: 0, ourCounter: 0 };
        this.naiveCounter = new NaiveCounter();
        this.ourCounter = new ActorSystem().createActor(
            "myCounter",
            CounterActor
        );

        this.naiveCounter.registerListener(number => {
            this.setState({ naiveCounter: number });
        });
        this.ourCounter.invoke().registerListener(number => {
            this.setState({ ourCounter: number });
        });
    }

    render() {
        return (
            <div>
                <button onClick={this.handleButtonClick}>Increment</button>
                <div>Naive counter: {this.state.naiveCounter}</div>
                <div>Our counter: {this.state.ourCounter}</div>
            </div>
        );
    }

    handleButtonClick = async () => {
        this.naiveCounter.increment();
        this.ourCounter.invoke().increment();
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
