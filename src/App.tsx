import * as React from "react";
import "./App.css";
import { Chat } from "./Chat";

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
            </div>
        );
    }
}

export default App;
