import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import * as socketIO from "socket.io";
import { ActorSystem } from "actrix";
import { ChatServerActor } from "./ServerActor/ChatServerActor";

const app = express();
app.use(express.static(path.join(__dirname, "build")));

const server = app.listen(process.env.PORT || 8888);
console.log("App is started");

const io = socketIO(server);
console.log("Web socket server is started");

const actorSystem = new ActorSystem("server");

actorSystem.createActor("chatActor", ChatServerActor);

io.of("/chat").on("connection", socket => {
    actorSystem.register(socket);
});
