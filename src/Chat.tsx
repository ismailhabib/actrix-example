import { ChatMessage } from "./ServerActor/ChatServerActor";
import * as React from "react";
import * as ioClient from "socket.io-client";
import { ActorSystem } from "./Actor/ActorSystem";
import { ChatClientActor } from "./ClientActor/ChatClientActor";

export class Chat extends React.Component<
    {},
    {
        messages: ChatMessage[];
        myMessage: string;
        userName: string;
        isConnected: boolean;
    }
> {
    actorSystem: ActorSystem | null = null;
    name = "ChatClient" + Math.random();
    constructor(props: {}) {
        super(props);
        this.state = {
            messages: [],
            myMessage: "",
            userName: "MyName",
            isConnected: false
        };
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
            const typedActorRef = actorRef.classType(ChatClientActor);
            this.actorSystem
                .compose()
                .target(typedActorRef)
                .type("registerListener")
                .payload({
                    fn: (messages: ChatMessage[]) => {
                        console.log("Updating component state");
                        this.setState({ messages: messages });
                    }
                })
                .send();
        }
    }
    render() {
        return (
            <div>
                <input
                    onChange={event => {
                        this.setState({ userName: event.currentTarget.value });
                    }}
                    value={this.state.userName}
                    readOnly={this.state.isConnected}
                />
                <button
                    onClick={() => {
                        this.actorSystem!
                            .compose()
                            .target(
                                this.actorSystem!
                                    .ref({
                                        actorSystemName: this.actorSystem!.name,
                                        localAddress: this.name
                                    })
                                    .classType(ChatClientActor)
                            )
                            .type("connect")
                            .payload({ userName: this.state.userName })
                            .send();
                        this.setState({ isConnected: true });
                    }}
                    disabled={this.state.isConnected}
                >
                    Connect
                </button>
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
                            .target(
                                this.actorSystem!
                                    .ref({
                                        actorSystemName: this.actorSystem!.name,
                                        localAddress: this.name
                                    })
                                    .classType(ChatClientActor)
                            )
                            .type("send")
                            .payload({ message: this.state.myMessage })
                            .send();
                        this.setState({ myMessage: "" });
                    }}
                    disabled={!this.state.isConnected}
                >
                    Post
                </button>
                {this.state.messages.map(message => (
                    <div>
                        <b>{message.userName}</b>:{message.message}
                    </div>
                ))}
            </div>
        );
    }
}
