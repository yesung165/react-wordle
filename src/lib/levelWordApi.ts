import axios from 'axios'

// Answers come from Random Word API, guesses are checked with Free Dictionary API.
// Both are free, need no key and allow browser requests (CORS).
const RANDOM_WORD_API_URL = 'https://random-word-api.herokuapp.com/word'
const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const REQUEST_TIMEOUT_MS = 5000

// Returns a random uppercase answer of the given length.
// Throws if the API can't be reached or returns an unusable response.
export const getRandomLevelWord = async (length: number) => {
  const response = await axios.get<unknown>(RANDOM_WORD_API_URL, {
    params: { number: 1, length },
    timeout: REQUEST_TIMEOUT_MS,
  })
  const data = response.data
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

  try {
    await axios.get(`${DICTIONARY_API_URL}${encodeURIComponent(lower)}`, {
      timeout: REQUEST_TIMEOUT_MS,
    })
    validWordCache.set(lower, true)
    return true
  } catch (e) {
    // 404 means the dictionary doesn't know the word; anything else is an API problem
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      validWordCache.set(lower, false)
      return false
    }
    throw e
  }
}
