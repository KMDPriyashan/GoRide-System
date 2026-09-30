import { haversineDistance, validateCoordinates } from './haversine.js'

const EARTH_RADIUS_KM = 6371.0088

function getLocation(point) {
  return point?.location ?? point?.currentLocation ?? point?.coordinates ?? point
}

function toUnitVector(location) {
  const latitude = (location.lat ?? location.latitude) * (Math.PI / 180)
  const longitude = (location.lng ?? location.longitude) * (Math.PI / 180)
  const latitudeRadius = Math.cos(latitude)

  return [
    latitudeRadius * Math.cos(longitude),
    latitudeRadius * Math.sin(longitude),
    Math.sin(latitude),
  ]
}

function chordDistanceToKm(chordDistance) {
  const boundedChord = Math.min(2, Math.max(0, chordDistance))
  return 2 * EARTH_RADIUS_KM * Math.asin(boundedChord / 2)
}

function squaredDistanceToSplitPlane(queryVector, nodeVector, axisIndex) {
  return (queryVector[axisIndex] - nodeVector[axisIndex]) ** 2
}

/**
 * A three-dimensional KD-tree for points on the unit sphere. Mapping latitude
 * and longitude to a unit vector avoids longitude wraparound at the date line.
 * Candidate distances are still measured with haversine; the chord-distance
 * lower bound is only used to decide whether a branch can be pruned safely.
 */
export class KDTree {
  constructor(points = []) {
    this.root = null
    this.points = []
    this.buildTree(points)
  }

  /**
   * Replace the tree contents and recursively split each subset at its median.
   * Median splits keep the tree reasonably balanced for typical ride-driver
   * point sets, while invalid locations are excluded from spatial indexing.
   */
  buildTree(points = []) {
    this.points = Array.isArray(points)
      ? points.filter((point) => validateCoordinates(getLocation(point)))
      : []

    const buildBranch = (branchPoints, depth) => {
      if (branchPoints.length === 0) return null

      const axisIndex = depth % 3
      const sortedPoints = [...branchPoints].sort((firstPoint, secondPoint) => {
        const firstCoordinate = toUnitVector(getLocation(firstPoint))[axisIndex]
        const secondCoordinate = toUnitVector(getLocation(secondPoint))[axisIndex]
        return firstCoordinate - secondCoordinate
      })
      const medianIndex = Math.floor(sortedPoints.length / 2)
      const point = sortedPoints[medianIndex]

      return {
        point,
        vector: toUnitVector(getLocation(point)),
        axisIndex,
        left: buildBranch(sortedPoints.slice(0, medianIndex), depth + 1),
        right: buildBranch(sortedPoints.slice(medianIndex + 1), depth + 1),
      }
    }

    this.root = buildBranch(this.points, 0)
    return this.root
  }

  /**
   * Return up to k points in ascending great-circle distance. The far branch
   * is visited only when its splitting plane could contain a better result
   * than the current kth-nearest point.
   */
  findNearest(location, k = 5) {
    if (!validateCoordinates(location)) {
      throw new RangeError('Search location must contain valid latitude and longitude values.')
    }

    const requestedCount = Number.isFinite(k) ? Math.max(0, Math.floor(k)) : 5
    if (requestedCount === 0 || !this.root) return []

    const queryVector = toUnitVector(location)
    const nearest = []

    const visitBranch = (node) => {
      if (!node) return

      const pointLocation = getLocation(node.point)
      const distanceKm = haversineDistance(
        location.lat ?? location.latitude,
        location.lng ?? location.longitude,
        pointLocation.lat ?? pointLocation.latitude,
        pointLocation.lng ?? pointLocation.longitude,
      )
      nearest.push({ point: node.point, distanceKm })
      nearest.sort((firstResult, secondResult) => firstResult.distanceKm - secondResult.distanceKm)
      if (nearest.length > requestedCount) nearest.pop()

      const axisIndex = node.axisIndex
      const queryCoordinate = queryVector[axisIndex]
      const nodeCoordinate = node.vector[axisIndex]
      const nearBranch = queryCoordinate < nodeCoordinate ? node.left : node.right
      const farBranch = queryCoordinate < nodeCoordinate ? node.right : node.left
      visitBranch(nearBranch)

      const farthestAcceptedKm =
        nearest.length < requestedCount ? Infinity : nearest[nearest.length - 1].distanceKm
      const planeLowerBoundKm = chordDistanceToKm(
        Math.sqrt(squaredDistanceToSplitPlane(queryVector, node.vector, axisIndex)),
      )

      if (planeLowerBoundKm <= farthestAcceptedKm) visitBranch(farBranch)
    }

    visitBranch(this.root)
    return nearest.map((result) => result.point)
  }

  /**
   * Return all points within radiusKm, ordered nearest-first. With the default
   * infinite radius this is a distance-sorted traversal of the full tree.
   */
  search(location, radiusKm = Infinity) {
    if (!validateCoordinates(location)) {
      throw new RangeError('Search location must contain valid latitude and longitude values.')
    }
    if (Number.isNaN(radiusKm) || radiusKm < 0) {
      throw new RangeError('Search radius must be a non-negative number.')
    }
    if (!this.root) return []

    const queryVector = toUnitVector(location)
    const maximumDistanceKm = Math.min(radiusKm, Math.PI * EARTH_RADIUS_KM)
    const maximumChordDistance = Number.isFinite(maximumDistanceKm)
      ? 2 * Math.sin(maximumDistanceKm / (2 * EARTH_RADIUS_KM))
      : Infinity
    const matches = []

    const visitBranch = (node) => {
      if (!node) return

      const pointLocation = getLocation(node.point)
      const distanceKm = haversineDistance(
        location.lat ?? location.latitude,
        location.lng ?? location.longitude,
        pointLocation.lat ?? pointLocation.latitude,
        pointLocation.lng ?? pointLocation.longitude,
      )
      if (distanceKm <= radiusKm) matches.push({ point: node.point, distanceKm })

      const axisIndex = node.axisIndex
      const queryCoordinate = queryVector[axisIndex]
      const nodeCoordinate = node.vector[axisIndex]
      const nearBranch = queryCoordinate < nodeCoordinate ? node.left : node.right
      const farBranch = queryCoordinate < nodeCoordinate ? node.right : node.left
      visitBranch(nearBranch)

      const planeChordDistance = Math.sqrt(
        squaredDistanceToSplitPlane(queryVector, node.vector, axisIndex),
      )
      if (planeChordDistance <= maximumChordDistance) visitBranch(farBranch)
    }

    visitBranch(this.root)
    matches.sort((firstResult, secondResult) => firstResult.distanceKm - secondResult.distanceKm)
    return matches.map((result) => result.point)
  }
}