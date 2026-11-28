const RANDOM_WORD_API_URL = 'https://random-word-api.herokuapp.com/word'
const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const REQUEST_TIMEOUT_MS = 5000

export const getRandomLevelWord = async (length: number) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  )
  const params = new URLSearchParams({ number: '1', length: String(length) })

  let response: Response
  try {
    response = await fetch(`${RANDOM_WORD_API_URL}?${params}`, {
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error('Random Word API request failed')
  }

  const data: unknown = await response.json()
  const word = Array.isArray(data) ? data[0] : undefined

  if (
    typeof word !== 'string' ||
    word.length !== length ||
    !/^[a-z]+$/i.test(word)
  ) {
    throw new Error('Random Word API returned an invalid word')
  }

  return word.toUpperCase()
}

const validWordCache = new Map<string, boolean>()

export const isValidLevelWord = async (word: string) => {
  const lower = word.toLowerCase()
  const cached = validWordCache.get(lower)
  if (cached !== undefined) {
    return cached
  }

  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    )
    const response = await fetch(
      `${DICTIONARY_API_URL}${encodeURIComponent(lower)}`,
      { signal: controller.signal }
    )
    window.clearTimeout(timeout)

    if (response.status === 404) {
      validWordCache.set(lower, false)
      return false
    }
    if (!response.ok) {
      throw new Error('Dictionary API request failed')
    }

    validWordCache.set(lower, true)
    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    if (
      error instanceof Error &&
      error.message === 'Dictionary API request failed'
    ) {
      throw error
    }
    throw error
  }
}
