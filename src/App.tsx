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
                <Chat />
                <Counter />
                <Switcher />
            </div>
        );
    }
}

export default App;
