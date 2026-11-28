import './App.css'

import { ClockIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { default as GraphemeSplitter } from 'grapheme-splitter'
import { useEffect, useState } from 'react'
import Div100vh from 'react-div-100vh'

import { AlertContainer } from './components/alerts/AlertContainer'
import { Grid } from './components/grid/Grid'
import { Keyboard } from './components/keyboard/Keyboard'
import { DatePickerModal } from './components/modals/DatePickerModal'
import { InfoModal } from './components/modals/InfoModal'
import { MigrateStatsModal } from './components/modals/MigrateStatsModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { StatsModal } from './components/modals/StatsModal'
import { Navbar } from './components/navbar/Navbar'
import {
  DATE_LOCALE,
  DISCOURAGE_INAPP_BROWSERS,
  LONG_ALERT_TIME_MS,
  MAX_CHALLENGES,
  REVEAL_TIME_MS,
  WELCOME_INFO_MODAL_MS,
} from './constants/settings'
import {
  CORRECT_WORD_MESSAGE,
  DISCOURAGE_INAPP_BROWSER_TEXT,
  GAME_COPIED_MESSAGE,
  HARD_MODE_ALERT_MESSAGE,
  NOT_ENOUGH_LETTERS_MESSAGE,
  SHARE_FAILURE_TEXT,
  WIN_MESSAGES,
  WORD_CHECK_FAILED_MESSAGE,
  WORD_NOT_FOUND_MESSAGE,
} from './constants/strings'
import { WORDS } from './constants/wordlist'
import { useAlert } from './context/AlertContext'
import { isInAppBrowser } from './lib/browser'
import { getRandomLevelWord, isValidLevelWord } from './lib/levelWordApi'
import {
  getStoredIsHighContrastMode,
  loadGameStateFromLocalStorage,
  saveGameStateToLocalStorage,
  setStoredIsHighContrastMode,
} from './lib/localStorage'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import {
  findFirstUnusedReveal,
  getGameDate,
  getIsLatestGame,
  isWordInWordList,
  setGameDate,
  solution,
  solutionGameDate,
  unicodeLength,
} from './lib/words'

function App() {
  const isLatestGame = getIsLatestGame()
  const gameDate = getGameDate()
  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches

  const { showError: showErrorAlert, showSuccess: showSuccessAlert } =
    useAlert()
  const [currentGuess, setCurrentGuess] = useState('')
  const [isGameWon, setIsGameWon] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false)
  const [isMigrateStatsModalOpen, setIsMigrateStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [currentRowClass, setCurrentRowClass] = useState('')
  const [isGameLost, setIsGameLost] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme')
      ? localStorage.getItem('theme') === 'dark'
      : prefersDarkMode
      ? true
      : false
  )
  const [isHighContrastMode, setIsHighContrastMode] = useState(
    getStoredIsHighContrastMode()
  )
  const [isRevealing, setIsRevealing] = useState(false)
  const [guesses, setGuesses] = useState<string[]>(() => {
    const loaded = loadGameStateFromLocalStorage(isLatestGame)
    if (loaded?.solution !== solution) {
      return []
    }
    const gameWasWon = loaded.guesses.includes(solution)
    if (gameWasWon) {
      setIsGameWon(true)
    }
    if (loaded.guesses.length === MAX_CHALLENGES && !gameWasWon) {
      setIsGameLost(true)
      showErrorAlert(CORRECT_WORD_MESSAGE(solution), {
        persist: true,
      })
    }
    return loaded.guesses
  })

  const [stats, setStats] = useState(() => loadStats())

  const [isHardMode, setIsHardMode] = useState(
    localStorage.getItem('gameMode')
      ? localStorage.getItem('gameMode') === 'hard'
      : false
  )

  type GameMode = 'title' | 'original' | 'timeAttack' | 'wordLength'
  const [gameMode, setGameMode] = useState<GameMode>('title')
  const [activeSolution, setActiveSolution] = useState(solution)
  const [countdown, setCountdown] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(60000)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  // word length mode state
  const [isWordLengthMenuOpen, setIsWordLengthMenuOpen] = useState(false) // length menu showing on title screen
  const [wordLength, setWordLength] = useState(5) // length the player picked
  const [isLoadingWord, setIsLoadingWord] = useState(false) // waiting for the API
  const [wordLoadError, setWordLoadError] = useState(false) // API request failed
  const [isCheckingWord, setIsCheckingWord] = useState(false) // waiting for the dictionary API
  // number of boxes per row: the picked length in word length mode, otherwise the answer's length
  const currentWordLength =
    gameMode === 'wordLength' ? wordLength : activeSolution.length

  useEffect(() => {
    // Show the welcome instructions only after entering Original Mode.
    if (gameMode === 'original' && !loadGameStateFromLocalStorage(true)) {
      setTimeout(() => {
        setIsInfoModalOpen(true)
      }, WELCOME_INFO_MODAL_MS)
    }
  }, [gameMode])

  useEffect(() => {
    DISCOURAGE_INAPP_BROWSERS &&
      isInAppBrowser() &&
      showErrorAlert(DISCOURAGE_INAPP_BROWSER_TEXT, {
        persist: false,
        durationMs: 7000,
      })
  }, [showErrorAlert])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (isHighContrastMode) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [isDarkMode, isHighContrastMode])

  const handleDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleHardMode = (isHard: boolean) => {
    if (guesses.length === 0 || localStorage.getItem('gameMode') === 'hard') {
      setIsHardMode(isHard)
      localStorage.setItem('gameMode', isHard ? 'hard' : 'normal')
    } else {
      showErrorAlert(HARD_MODE_ALERT_MESSAGE)
    }
  }

  const handleHighContrastMode = (isHighContrast: boolean) => {
    setIsHighContrastMode(isHighContrast)
    setStoredIsHighContrastMode(isHighContrast)
  }

  const clearCurrentRowClass = () => {
    setCurrentRowClass('')
  }

  useEffect(() => {
    if (gameMode === 'original') {
      saveGameStateToLocalStorage(getIsLatestGame(), { guesses, solution })
    }
  }, [guesses, gameMode])

  useEffect(() => {
    if (gameMode !== 'original') return
    if (isGameWon) {
      const winMessage =
        WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
      const delayMs = REVEAL_TIME_MS * solution.length

      showSuccessAlert(winMessage, {
        delayMs,
        onClose: () => setIsStatsModalOpen(true),
      })
    }

    if (isGameLost) {
      setTimeout(() => {
        setIsStatsModalOpen(true)
      }, (solution.length + 1) * REVEAL_TIME_MS)
    }
  }, [isGameWon, isGameLost, showSuccessAlert, gameMode])

  useEffect(() => {
    if (gameMode !== 'timeAttack' || !countdown) return
    const delay = countdown === 'GO!' ? 500 : 1000
    const next = countdown === '2' ? '1' : countdown === '1' ? 'GO!' : ''
    if (countdown === 'GO!') setIsTimerRunning(true)
    const timeout = window.setTimeout(() => setCountdown(next), delay)
    return () => window.clearTimeout(timeout)
  }, [countdown, gameMode])

  useEffect(() => {
    if (
      gameMode !== 'timeAttack' ||
      !isTimerRunning ||
      isGameWon ||
      isGameLost
    ) {
      return
    }
    const deadline = Date.now() + 60000
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now())
      setTimeRemaining(remaining)
      if (remaining === 0) setIsGameLost(true)
    }, 10)
    return () => window.clearInterval(interval)
  }, [isTimerRunning, gameMode, isGameWon, isGameLost])

  const startOriginalMode = () => {
    setGameMode('original')
    setActiveSolution(solution)
    const saved = loadGameStateFromLocalStorage(getIsLatestGame())
    const restoredGuesses = saved?.solution === solution ? saved.guesses : []
    setGuesses(restoredGuesses)
    setCurrentGuess('')
    setIsGameWon(restoredGuesses.includes(solution))
    setIsGameLost(
      restoredGuesses.length === MAX_CHALLENGES &&
        !restoredGuesses.includes(solution)
    )
    setCountdown('')
  }

  const startTimeAttack = () => {
    const randomWord =
      WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase()
    setActiveSolution(randomWord)
    setGuesses([])
    setCurrentGuess('')
    setIsGameWon(false)
    setIsGameLost(false)
    setTimeRemaining(60000)
    setIsTimerRunning(false)
    setCountdown('2')
    setGameMode('timeAttack')
  }

  // start a new word length game: reset the board, then fetch an answer of the picked length
  const startWordLengthMode = async (length: number) => {
    setWordLength(length)
    setActiveSolution('') // no answer until the API responds
    setWordLoadError(false)
    setIsLoadingWord(true)
    setGuesses([])
    setCurrentGuess('')
    setIsGameWon(false)
    setIsGameLost(false)
    setCountdown('')
    setIsTimerRunning(false)
    setIsWordLengthMenuOpen(false)
    setGameMode('wordLength')

    // ask random word API for the answer; show an error with a retry link if it fails
    try {
      const word = await getRandomLevelWord(length)
      setActiveSolution(word)
    } catch (e) {
      console.log(e)
      setWordLoadError(true)
    } finally {
      setIsLoadingWord(false)
    }
  }

  const returnToTitle = () => {
    setCountdown('')
    setIsTimerRunning(false)
    setGameMode('title')
  }

  const onChar = (value: string) => {
    if (
      unicodeLength(`${currentGuess}${value}`) <= currentWordLength &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon &&
      !isGameLost &&
      (gameMode !== 'timeAttack' || isTimerRunning) &&
      // in word length mode, block typing until the answer has loaded
      (gameMode !== 'wordLength' || activeSolution !== '') &&
      !isCheckingWord
    ) {
      setCurrentGuess(`${currentGuess}${value}`)
    }
  }

  const onDelete = () => {
    if (
      isGameWon ||
      isGameLost ||
      (gameMode === 'timeAttack' && !isTimerRunning) ||
      isCheckingWord
    )
      return
    setCurrentGuess(
      new GraphemeSplitter().splitGraphemes(currentGuess).slice(0, -1).join('')
    )
  }

  const onEnter = async () => {
    if (
      isGameWon ||
      isGameLost ||
      (gameMode === 'timeAttack' && !isTimerRunning) ||
      isCheckingWord
    ) {
      return
    }

    if (!(unicodeLength(currentGuess) === currentWordLength)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(NOT_ENOUGH_LETTERS_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
    }

    if (gameMode === 'wordLength') {
      // the answer is always accepted, even if the dictionary doesn't know it
      if (currentGuess !== activeSolution) {
        // check the guess with the dictionary API; typing is blocked while waiting
        setIsCheckingWord(true)
        let isValid: boolean
        try {
          isValid = await isValidLevelWord(currentGuess)
        } catch (e) {
          console.log(e)
          setCurrentRowClass('jiggle')
          return showErrorAlert(WORD_CHECK_FAILED_MESSAGE, {
            onClose: clearCurrentRowClass,
          })
        } finally {
          setIsCheckingWord(false)
        }
        if (!isValid) {
          setCurrentRowClass('jiggle')
          return showErrorAlert(WORD_NOT_FOUND_MESSAGE, {
            onClose: clearCurrentRowClass,
          })
        }
      }
    } else if (!isWordInWordList(currentGuess)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(WORD_NOT_FOUND_MESSAGE, {
        onClose: clearCurrentRowClass,
      })
    }

    // enforce hard mode - all guesses must contain all previously revealed letters
    if (isHardMode && gameMode === 'original') {
      const firstMissingReveal = findFirstUnusedReveal(currentGuess, guesses)
      if (firstMissingReveal) {
        setCurrentRowClass('jiggle')
        return showErrorAlert(firstMissingReveal, {
          onClose: clearCurrentRowClass,
        })
      }
    }

    setIsRevealing(true)
    // turn this back off after all
    // chars have been revealed
    setTimeout(() => {
      setIsRevealing(false)
    }, REVEAL_TIME_MS * currentWordLength)

    const winningWord = currentGuess === activeSolution

    if (
      unicodeLength(currentGuess) === currentWordLength &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      setGuesses([...guesses, currentGuess])
      setCurrentGuess('')

      if (winningWord) {
        if (isLatestGame && gameMode === 'original') {
          setStats(addStatsForCompletedGame(stats, guesses.length))
        }
        return setIsGameWon(true)
      }

      if (guesses.length === MAX_CHALLENGES - 1) {
        if (isLatestGame && gameMode === 'original') {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
        }
        setIsGameLost(true)
        if (gameMode === 'original') {
          showErrorAlert(CORRECT_WORD_MESSAGE(solution), {
            persist: true,
            delayMs: REVEAL_TIME_MS * solution.length + 1,
          })
        }
      }
    }
  }

  if (gameMode === 'title') {
    return (
      <Div100vh>
        <div className="mode-title-screen">
          <h1>WORDLE</h1>
          {/* title screen shows either the length menu or the mode list */}
          {isWordLengthMenuOpen ? (
            <>
              <p>Choose a word length</p>
              {[4, 5, 6, 7].map((length) => (
                <button
                  key={length}
                  onClick={() => startWordLengthMode(length)}
                >
                  {length} Letters
                </button>
              ))}
              <button onClick={() => setIsWordLengthMenuOpen(false)}>
                Back
              </button>
            </>
          ) : (
            <>
              <p>Choose your game mode</p>
              <button onClick={startOriginalMode}>Original Mode</button>
              <button onClick={startTimeAttack}>Time Attack Mode</button>
              <button onClick={() => setIsWordLengthMenuOpen(true)}>
                Word Length
              </button>
            </>
          )}
        </div>
      </Div100vh>
    )
  }

  const timerColor = (() => {
    if (timeRemaining > 10000) return '#16a34a'
    const progress = Math.max(0, Math.min(1, timeRemaining / 10000))
    const start = { r: 220, g: 38, b: 38 }
    const end = { r: 22, g: 163, b: 74 }
    const channel = (a: number, b: number) => Math.round(a + (b - a) * progress)
    return `rgb(${channel(start.r, end.r)}, ${channel(
      start.g,
      end.g
    )}, ${channel(start.b, end.b)})`
  })()

  const formattedTime = `${(timeRemaining / 1000).toFixed(3)}`

  return (
    <Div100vh>
      <div className="flex h-full flex-col">
        <Navbar
          setIsInfoModalOpen={setIsInfoModalOpen}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsDatePickerModalOpen={setIsDatePickerModalOpen}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
        />

        {gameMode === 'timeAttack' && (
          <div className="time-attack-timer" style={{ color: timerColor }}>
            {countdown ? countdown : formattedTime}
          </div>
        )}
        {/* word length mode: loading message, or an error with a retry link */}
        {gameMode === 'wordLength' && (isLoadingWord || wordLoadError) && (
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
            {isLoadingWord ? (
              <p>Loading word...</p>
            ) : (
              <>
                <p>Couldn't load a word.</p>
                <button
                  className="underline"
                  onClick={() => startWordLengthMode(wordLength)}
                >
                  Try again
                </button>
              </>
            )}
          </div>
        )}
        {gameMode === 'original' && !isLatestGame && (
          <div className="flex items-center justify-center">
            <ClockIcon className="h-6 w-6 stroke-gray-600 dark:stroke-gray-300" />
            <p className="text-base text-gray-600 dark:text-gray-300">
              {format(gameDate, 'd MMMM yyyy', { locale: DATE_LOCALE })}
            </p>
          </div>
        )}

        <div className="mx-auto flex w-full grow flex-col px-1 pt-2 pb-8 sm:px-6 md:max-w-7xl lg:px-8 short:pb-2 short:pt-2">
          <div className="flex grow flex-col justify-center pb-6 short:pb-2">
            <Grid
              solution={activeSolution}
              solutionLength={currentWordLength}
              guesses={guesses}
              currentGuess={currentGuess}
              isRevealing={isRevealing}
              currentRowClassName={currentRowClass}
            />
          </div>
          <Keyboard
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            solution={activeSolution}
            guesses={guesses}
            isRevealing={isRevealing}
          />
          <InfoModal
            isOpen={isInfoModalOpen}
            handleClose={() => setIsInfoModalOpen(false)}
          />
          <StatsModal
            isOpen={isStatsModalOpen}
            handleClose={() => setIsStatsModalOpen(false)}
            solution={activeSolution}
            guesses={guesses}
            gameStats={stats}
            isLatestGame={isLatestGame}
            isGameLost={isGameLost}
            isGameWon={isGameWon}
            handleShareToClipboard={() => showSuccessAlert(GAME_COPIED_MESSAGE)}
            handleShareFailure={() =>
              showErrorAlert(SHARE_FAILURE_TEXT, {
                durationMs: LONG_ALERT_TIME_MS,
              })
            }
            handleMigrateStatsButton={() => {
              setIsStatsModalOpen(false)
              setIsMigrateStatsModalOpen(true)
            }}
            isHardMode={isHardMode}
            isDarkMode={isDarkMode}
            isHighContrastMode={isHighContrastMode}
            numberOfGuessesMade={guesses.length}
          />
          <DatePickerModal
            isOpen={isDatePickerModalOpen}
            initialDate={solutionGameDate}
            handleSelectDate={(d) => {
              setIsDatePickerModalOpen(false)
              setGameDate(d)
            }}
            handleClose={() => setIsDatePickerModalOpen(false)}
          />
          <MigrateStatsModal
            isOpen={isMigrateStatsModalOpen}
            handleClose={() => setIsMigrateStatsModalOpen(false)}
          />
          <SettingsModal
            isOpen={isSettingsModalOpen}
            handleClose={() => setIsSettingsModalOpen(false)}
            isHardMode={isHardMode}
            handleHardMode={handleHardMode}
            isDarkMode={isDarkMode}
            handleDarkMode={handleDarkMode}
            isHighContrastMode={isHighContrastMode}
            handleHighContrastMode={handleHighContrastMode}
          />
          {gameMode === 'timeAttack' && (isGameWon || isGameLost) && (
            <div className="time-attack-result">
              <div>
                <h2>{isGameWon ? 'Congratulations!' : "Time's up!"}</h2>
                <p>
                  {isGameWon
                    ? 'You found the word!'
                    : `The word was ${activeSolution}.`}
                </p>
                <button onClick={startTimeAttack}>Retry</button>
                <button onClick={returnToTitle}>Title</button>
              </div>
            </div>
          )}
          {/* word length mode result, shown after the last row finishes flipping */}
          {gameMode === 'wordLength' &&
            (isGameWon || isGameLost) &&
            !isRevealing && (
              <div className="time-attack-result">
                <div>
                  <h2>{isGameWon ? 'Congratulations!' : 'Out of guesses!'}</h2>
                  <p>
                    {isGameWon
                      ? `You found the ${wordLength}-letter word!`
                      : `The word was ${activeSolution}.`}
                  </p>
                  {/* new word of the same length */}
                  <button onClick={() => startWordLengthMode(wordLength)}>
                    Play Again
                  </button>
                  <button onClick={returnToTitle}>Title</button>
                </div>
              </div>
            )}
          <AlertContainer />
        </div>
      </div>
    </Div100vh>
  )
}

export default App
