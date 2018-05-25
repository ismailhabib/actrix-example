import * as React from "react";
import "./App.css";
import { Chat } from "./Chat";
import { Counter } from "./Counter";
import { Switcher } from "./Switcher";

const logo = require("./logo.svg");

class App extends React.Component<{}, {}> {
    constructor(props: {}) {
        super(props);
        this.state = { message: "no message" };
    }

    render() {
        return (
            <div className="App">
                <h1>Chat example (open in multiple tabs/windows/browsers)</h1>
                <Chat />
                <h1>Counter example</h1>
                <Counter />
                <h1>Cancellation example</h1>
                <Switcher />
            </div>
        );
    }
}

export default App;
