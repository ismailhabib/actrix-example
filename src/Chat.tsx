import { ChatMessage } from "./ServerActor/ChatServerActor";
import * as React from "react";
import * as ioClient from "socket.io-client";
import { ActorSystem } from "./Actor/ActorSystem";
import { ChatClientActor } from "./ClientActor/ChatClientActor";

export class Chat extends React.Component<
    {},
    { messages: ChatMessage[]; myMessage: string }
> {
    actorSystem: ActorSystem | null = null;
    name = "ChatClient" + Math.random();
    constructor(props: {}) {
        super(props);
        this.state = { messages: [], myMessage: "" };
    }

    componentDidMount() {
        const socket = ioClient.connect("/chat");

        this.actorSystem = new ActorSystem();
        this.actorSystem.register(socket);

        this.actorSystem.createActor(this.name, ChatClientActor);
        const actorRef = this.actorSystem.findActor({
            actorSystemName: this.actorSystem.name,
            localAddress: this.name
        });
        if (actorRef) {
            this.actorSystem
                .compose()
                .classType(ChatClientActor)
                .type("registerListener")
                .payload({
                    fn: (messages: ChatMessage[]) => {
                        console.log("Updating component state");
                        this.setState({ messages: messages });
                    }
                })
                .target(actorRef)
                .send();
        }
    }
    render() {
        console.log(this.state.messages);
        const messages = this.state.messages.reduce(
            (prev, cur) =>
                `${prev}\n${cur.user.actorSystemName}/${
                    cur.user.localAddress
                }:${cur.message}`,
            ""
        );
        console.log("Combine messages", messages);
        return (
            <div>
                <textarea readOnly={true} value={messages} />
                <textarea
                    onChange={event => {
                        this.setState({ myMessage: event.currentTarget.value });
                    }}
                    value={this.state.myMessage}
                />
                <button
                    onClick={() => {
                        this.actorSystem!
                            .compose()
                            .classType(ChatClientActor)
                            .target({
                                actorSystemName: this.actorSystem!.name,
                                localAddress: this.name
                            })
                            .type("send")
                            .payload({ message: this.state.myMessage })
                            .send();
                        this.setState({ myMessage: "" });
                    }}
                >
                    Post
                </button>
            </div>
        );
    }
}
