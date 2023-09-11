type ListenerFunction = (...args: unknown[]) => void;
class EventEmitter {
  private listeners = new Map<string, ListenerFunction[]>();

  on(event: string, listener: ListenerFunction) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(listener);
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

export const eventEmitter = new EventEmitter();
