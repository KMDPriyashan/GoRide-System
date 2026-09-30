export const RIDE_STATES = Object.freeze([
  'requested',
  'accepted',
  'arrived',
  'started',
  'completed',
  'cancelled',
])

const VALID_TRANSITIONS = Object.freeze({
  requested: ['accepted', 'cancelled'],
  accepted: ['arrived', 'cancelled'],
  arrived: ['started', 'cancelled'],
  started: ['completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: [],
})

/** Check whether a ride may move directly from one known state to another. */
export function canTransition(fromState, toState) {
  return VALID_TRANSITIONS[fromState]?.includes(toState) ?? false
}