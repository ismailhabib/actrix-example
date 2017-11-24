import { Message, Address } from "./interfaces";
import { ActorSystem, ActorRef } from "./ActorSystem";

export abstract class Actor {
  private name: string;
  private address: Address;
  private mailBox: { message: Message; senderAddress: Address | null }[];
  private timerId: number | null;

  constructor(name: string, protected actorSystem: ActorSystem) {
    this.name = name;
    this.address = name; // TODO
    this.mailBox = [];
    this.timerId = null;
  }

  protected abstract handleMessage(
    message: Message,
    senderAddress: Address | null
  ): void;

  pushToMailbox = (message: Message, senderAddress: Address | null) => {
    this.mailBox.push({ message, senderAddress });
    this.scheduleNextTick();
  };

  send = (target: ActorRef | Address, message: Message) => {
    this.actorSystem.sendMessage(target, message, this.address);
  };

  private scheduleNextTick = () => {
    if (!this.timerId) {
      this.timerId = setTimeout(this.executeTick);
    }
  };

  private executeTick = async () => {
    const msgAndSender = this.mailBox.shift();
    try {
      if (msgAndSender) {
        const { message, senderAddress } = msgAndSender;
        await this.handleMessage(message, senderAddress);
      }
    } catch (ex) {
      console.error(
        `Actor ${this.name} failed to handle a message`,
        msgAndSender,
        ex
      );
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.timerId = null;
    if (this.mailBox.length) {
      this.scheduleNextTick();
    }
  };
}
