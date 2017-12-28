import * as React from "react";
import "./App.css";
import * as ioClient from "socket.io-client";
import { ActorSystem, TypedActorRef } from "./Actor/ActorSystem";
import { ClientActor, ClientActorPayload } from "./ClientActor/ClientActor";

const logo = require("./logo.svg");

class App extends React.Component<{}, { message: string }> {
    constructor(props: {}) {
        super(props);
        this.state = { message: "no message" };
    }
    componentDidMount() {
        const socket = ioClient.connect("/ws");
        socket.on("greet", (message: string) => {
            this.setState({ message: message });
        });

        const actorSystem = new ActorSystem();
        actorSystem.listenTo(socket);

        actorSystem.createActor("clientActor", ClientActor);
        const actorRef = actorSystem.findActor("clientActor");
        if (actorRef) {
            actorRef.asTypedActorRef(ClientActor).putToMailbox(
                "registerCallback",
                payload => {
                    this.setState({ message: payload });
                },
                null
            );
        }
    }

    render() {
        return (
            <div className="App">
                Latest message: {this.state.message}
                <textarea readOnly={true}>{this.state.message}</textarea>
                <textarea />
                <button>Post</button>
            </div>
        );
    }
}

export default App;
