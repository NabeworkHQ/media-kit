export type Listener<T = unknown> = (payload: T) => void;

/**
 * Minimal typed pub/sub. Kept dependency-free so the core bundle stays
 * small and framework-agnostic.
 */
export class EventBus {
  private listeners = new Map<string, Set<Listener<any>>>();

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener<any>);
    return () => this.off(event, listener);
  }

  once<T = unknown>(event: string, listener: Listener<T>): () => void {
    const off = this.on<T>(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  off<T = unknown>(event: string, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener as Listener<any>);
  }

  emit<T = unknown>(event: string, payload?: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy to guard against listeners mutating the set mid-emit.
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (err) {
        // Never let a subscriber's bug break the emitting call site.
        // eslint-disable-next-line no-console
        console.error(`[media-kit] listener for "${event}" threw`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
