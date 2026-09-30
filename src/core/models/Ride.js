import { v4 as uuidv4 } from 'uuid'
import { generateRideNumber } from '../../shared/utils/formatters.js'
import { canTransition, RIDE_STATES } from '../stateMachine/rideStateMachine.js'

const TIMESTAMP_FIELD_BY_STATE = Object.freeze({
  accepted: 'acceptedAt',
  arrived: 'arrivedAt',
  started: 'startedAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
})

/** Create a new ride record with generated identifiers and default timestamps. */
export function createRide(rideData = {}) {
  const initialState = rideData.state ?? 'requested'
  if (!RIDE_STATES.includes(initialState)) {
    throw new RangeError(`Unknown initial ride state: ${initialState}`)
  }

  const now = new Date().toISOString()

  return {
    ...rideData,
    id: rideData.id ?? uuidv4(),
    rideNumber: rideData.rideNumber ?? generateRideNumber(),
    state: initialState,
    createdAt: rideData.createdAt ?? now,
    updatedAt: now,
  }
}

/**
 * Return an updated ride for a valid single-step transition. State and update
 * timestamps are controlled here so arbitrary metadata cannot override them.
 */
export function transitionRide(ride, nextState, updates = {}) {
  if (!ride || !canTransition(ride.state, nextState)) {
    const currentState = ride?.state ?? 'unknown'
    throw new Error(`Invalid ride transition: ${currentState} -> ${nextState}`)
  }

  const updatedAt = new Date().toISOString()
  const timestampField = TIMESTAMP_FIELD_BY_STATE[nextState]

  return {
    ...ride,
    ...updates,
    state: nextState,
    updatedAt,
    ...(timestampField ? { [timestampField]: updatedAt } : {}),
  }
}