// Answers come from Random Word API, guesses are checked with Free Dictionary API.
// Both are free, need no key and allow browser requests (CORS).
const RANDOM_WORD_API_URL = 'https://random-word-api.herokuapp.com/word'
const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const REQUEST_TIMEOUT_MS = 5000

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  )
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

// Returns a random uppercase answer of the given length.
// Throws if the API can't be reached or returns an unusable response.
export const getRandomLevelWord = async (length: number) => {
  const response = await fetchWithTimeout(
    `${RANDOM_WORD_API_URL}?number=1&length=${length}`
  )
  if (!response.ok) {
    throw new Error(`Random Word API error: ${response.status}`)
  }
  const data = await response.json()
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

// Checks whether a guess is a real English word.
// Throws if the dictionary API can't be reached.
export const isValidLevelWord = async (word: string) => {
  const lower = word.toLowerCase()
  const cached = validWordCache.get(lower)
  if (cached !== undefined) {
    return cached
  }

  const response = await fetchWithTimeout(
    `${DICTIONARY_API_URL}${encodeURIComponent(lower)}`
  )
  if (!response.ok && response.status !== 404) {
    throw new Error(`Dictionary API error: ${response.status}`)
  }
  validWordCache.set(lower, response.ok)
  return response.ok
}
