/** A small synchronous event emitter with snapshot-safe listener iteration. */
const CROSS_TAB_EVENT_KEY = 'gr_event_bus_message'
const CROSS_TAB_EVENTS = new Set([
  'ride:requested',
  'ride:rejected',
  'ride:accepted',
  'ride:arrived',
  'ride:started',
  'ride:completed',
  'ride:cancelled',
  'driver:location',
  'driver:online',
  'driver:offline',
])

export class EventEmitter {
  constructor() {
    this.listenersByEvent = new Map()
    this.sourceId = `${Date.now()}-${Math.random()}`

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (storageEvent) => {
        if (storageEvent.key !== CROSS_TAB_EVENT_KEY || !storageEvent.newValue) return

        try {
          const message = JSON.parse(storageEvent.newValue)
          if (message.sourceId === this.sourceId || !CROSS_TAB_EVENTS.has(message.eventName)) return
          const listeners = this.listenersByEvent.get(message.eventName)
          if (!listeners?.size) return
          for (const listener of [...listeners]) listener(...message.args)
        } catch {
          return
        }
      })
    }
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
    const hasListeners = Boolean(listeners?.size)

    if (listeners?.size) {
      for (const listener of [...listeners]) listener(...args)
    }

    if (CROSS_TAB_EVENTS.has(eventName) && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CROSS_TAB_EVENT_KEY, JSON.stringify({
          sourceId: this.sourceId,
          eventName,
          args,
          emittedAt: Date.now(),
        }))
      } catch {
        return hasListeners
      }
    }

    return hasListeners
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