import { Message } from "./interfaces";

export abstract class Actor {
  private name: string;
  private mailBox: Message[];
  private timerId: number | null;

  constructor(name: string) {
    this.name = name;
    this.mailBox = [];
    this.timerId = null;
  }

  protected abstract handleMessage(message: Message): void;

  send = (message: Message) => {
    this.mailBox.push(message);
    this.scheduleNextTick();
  };

  private scheduleNextTick = () => {
    if (!this.timerId) {
      this.timerId = setTimeout(this.executeTick);
    }
  };

  private executeTick = async () => {
    const message = this.mailBox.shift();
    try {
      if (message) {
        await this.handleMessage(message);
      }
    } catch (ex) {
      console.error(
        `Actor ${this.name} failed to handle a message`,
        message,
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
