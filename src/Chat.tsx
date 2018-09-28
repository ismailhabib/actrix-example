import { ChatMessage } from "./ServerActor/ChatServerActor";
import * as React from "react";
import * as ioClient from "socket.io-client";
import { ActorSystem, ActorRef } from "actrix";
import {
    ChatClientActor,
    ChatClientActorAPI
} from "./ClientActor/ChatClientActor";

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
    actorRef: ActorRef<ChatClientActorAPI> | undefined;
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

    componentWillMount() {
        const socket = ioClient.connect("/chat");

        this.actorSystem = new ActorSystem();
        this.actorSystem.register(socket);

        this.actorRef = this.actorSystem.createActor({
            name: this.name,
            actorClass: ChatClientActor
        });

        this.actorRef.invoke().registerListener({
            fn: (messages: ChatMessage[]) => {
                console.log("Updating component state");
                this.setState({ messages: messages });
            }
        });
    }
    render() {
        return (
            <div>
                <div>
                    <input
                        onChange={event => {
                            this.setState({
                                userName: event.currentTarget.value
                            });
                        }}
                        value={this.state.userName}
                        readOnly={this.state.isConnected}
                    />
                    <button
                        onClick={() => {
                            this.actorRef!.invoke().connect({
                                userName: this.state.userName
                            });
                            this.setState({ isConnected: true });
                        }}
                        disabled={this.state.isConnected}
                    >
                        Connect
                    </button>
                </div>
                <div>&nbsp;</div>
                <div>
                    <textarea
                        onChange={event => {
                            this.setState({
                                myMessage: event.currentTarget.value
                            });
                        }}
                        value={this.state.myMessage}
                    />
                    <div>&nbsp;</div>
                    <button
                        onClick={() => {
                            this.actorRef!.invoke().send({
                                message: this.state.myMessage
                            });
                            this.setState({ myMessage: "" });
                        }}
                        disabled={!this.state.isConnected}
                    >
                        Post
                    </button>
                    <div>&nbsp;</div>
                    {this.state.messages.map(message => (
                        <div>
                            <b>{message.userName}</b>:{message.message}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
