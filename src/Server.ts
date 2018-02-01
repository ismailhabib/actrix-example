import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import * as socketIO from "socket.io";
import { ActorSystem } from "./Actor/ActorSystem";
import { ServerActor } from "./ServerActor/ServerActor";
import { ChatServerActor } from "./ServerActor/ChatServerActor";

const app = express();
app.use(express.static(path.join(__dirname, "build")));

app.get("/ping", (req, res) => {
    return res.send("pong");
});

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "../build", "index.html"));
// });

const server = app.listen(process.env.PORT || 8888);
console.log("App is started");

const io = socketIO(server);
console.log("Web socket server is started");

// const actorSystem = new ActorSystem();

// actorSystem.createActor("serverActor", ServerActor);

// io.of("/ws").on("connection", socket => {
//     console.log("A connection has been started");
//     actorSystem.listenTo(socket);
// });

const actorSystem = new ActorSystem("server");

actorSystem.createActor("chatActor", ChatServerActor);

io.of("/chat").on("connection", socket => {
    actorSystem.listenTo(socket);
});
