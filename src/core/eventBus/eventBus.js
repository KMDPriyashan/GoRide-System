/** A small synchronous event emitter with snapshot-safe listener iteration. */
export class EventEmitter {
  constructor() {
    this.listenersByEvent = new Map()
  }

  /** Register a listener and return the emitter for chainable registration. */
  on(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Event listeners must be functions.')
    }

    const listeners = this.listenersByEvent.get(eventName) ?? new Set()
    listeners.add(listener)
    this.listenersByEvent.set(eventName, listeners)
    return this
  }

  /** Register a listener that is removed before its first invocation. */
  once(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Event listeners must be functions.')
    }

    const onceListener = (...args) => {
      this.off(eventName, onceListener)
      listener(...args)
    }

    return this.on(eventName, onceListener)
  }

  /** Remove one listener from an event. */
  off(eventName, listener) {
    const listeners = this.listenersByEvent.get(eventName)
    if (!listeners) return this

    listeners.delete(listener)
    if (listeners.size === 0) this.listenersByEvent.delete(eventName)
    return this
  }

  /** Emit synchronously; return false when no listener was registered. */
  emit(eventName, ...args) {
    const listeners = this.listenersByEvent.get(eventName)
    if (!listeners?.size) return false

    for (const listener of [...listeners]) listener(...args)
    return true
  }

  /** Remove one event's listeners, or all listeners when no event is provided. */
  removeAllListeners(eventName) {
    if (eventName === undefined) this.listenersByEvent.clear()
    else this.listenersByEvent.delete(eventName)
    return this
  }

  /** Return a copy so callers cannot mutate the emitter's listener set. */
  listeners(eventName) {
    return [...(this.listenersByEvent.get(eventName) ?? [])]
  }

  /** Report the current number of listeners for an event. */
  listenerCount(eventName) {
    return this.listenersByEvent.get(eventName)?.size ?? 0
  }
}

export const eventBus = new EventEmitter()

export default eventBus