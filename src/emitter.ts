type Handler = (payload: never) => void;

/**
 * A small typed event emitter. A listener that throws is reported on the
 * console and does not stop the others, nor the widget.
 */
export class Emitter<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<Handler>>();

  /** Subscribes to an event; returns the function that unsubscribes. */
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    this.handlers.get(event)?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    // A copy, so that listeners may unsubscribe while being called.
    for (const listener of [...(this.handlers.get(event) ?? [])]) {
      try {
        (listener as (payload: Events[K]) => void)(payload);
      } catch (error) {
        console.error(`[Goldpan] A "${String(event)}" listener failed:`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
