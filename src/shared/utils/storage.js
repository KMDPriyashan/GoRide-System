function getStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Read and parse a stored JSON value, falling back when storage is unavailable. */
export function getItem(key, fallback = null) {
  const storage = getStorage()
  if (!storage) return fallback

  try {
    const value = storage.getItem(key)
    if (value === null) return fallback

    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  } catch {
    return fallback
  }
}

/** Store any JSON-serializable value; return false if storage rejects the write. */
export function setItem(key, value) {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Remove one key and report whether the operation could be attempted. */
export function removeItem(key) {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** Clear this origin's local storage without throwing in restricted contexts. */
export function clearAll() {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.clear()
    return true
  } catch {
    return false
  }
}