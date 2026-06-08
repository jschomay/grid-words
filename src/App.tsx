import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import Puzzle from './puzzle'
import { createStore, produce } from 'solid-js/store'
import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

type Coord = { x: number, y: number }
const EMPTY = "bg-gray-700"
const CORRECT = "bg-green-400"
const IN_ROW = "bg-yellow-400"
const IN_PUZZLE = "bg-indigo-400"
const WRONG = "bg-gray-400"

function coordToString({ x, y }: Coord): string {
  return `${x},${y}`
}

const status = (guesses: Record<string, string>, coord: Coord, puzzle: Puzzle) => {
  const guess = guesses[coordToString(coord)]
  if (puzzle.valueAt(coord) === "#") {
    return EMPTY
  } else if (guess && guess.toLowerCase() === puzzle.valueAt(coord).toLowerCase()) {
    return CORRECT
  } else if (letterIsInRowOrColStill(guesses, coord, puzzle)) {
    return IN_ROW
  } else if (letterIsInPuzzleStill(guess, guesses, puzzle)) {
    return IN_PUZZLE
  } else if (guess) {
    return WRONG
  } else {
    return "bg-white"
  }
}

const wordToPuzzleCoords = (coord: Coord, word: string[], wordIndex: number, direction: "down" | "across"): string[] => {
  if (direction === "across") {
    return word.map((_w, i) => coordToString({ x: coord.x - wordIndex + i, y: coord.y }))
  } else {
    return word.map((_w, i) => coordToString({ x: coord.x, y: coord.y - wordIndex + i }))
  }
}

const letterIsInRowOrColStill = (guesses: Record<string, string>, coord: Coord, puzzle: Puzzle): boolean => {
  let [across, down] = puzzle.wordsAt(coord)
  across[0] = across[0].map(c => c.toLowerCase())
  down[0] = down[0].map(c => c.toLowerCase())
  const puzzleCoordsDown = wordToPuzzleCoords(coord, across[0], across[1], "across")
  const puzzleCoordsAcross = wordToPuzzleCoords(coord, down[0], down[1], "down")
  const guessesAcross = puzzleCoordsDown.map((coord) => guesses[coord])
  const guessesDown = puzzleCoordsAcross.map((coord) => guesses[coord])

  const redacted = "$"

  // remove correct guess from words
  across[0] = across[0].map((v, i) => v === guessesAcross[i] ? redacted : v)
  down[0] = down[0].map((v, i) => v === guessesDown[i] ? redacted : v)

  return across[0].concat(down[0]).includes(guesses[coordToString(coord)])
}

const letterIsInPuzzleStill = (guess: string, guesses: Record<string, string>, puzzle: Puzzle) => {
  return puzzle.ipuz.solution
    .flatMap((row, y) => row.filter((cell, x) => guesses[coordToString({ x, y })]?.toLowerCase() !== cell.toLowerCase()))
    .includes(guess?.toUpperCase())
}

const puzzleIsComplete = (guesses: Record<string, string>, puzzle: Puzzle) => {
  return puzzle.ipuz.solution
    .flatMap((row, y) => row.map((cell, x) => cell === "#" || guesses[coordToString({ x, y })]?.toLowerCase() === cell.toLowerCase())).every(x => x)
}

const [coords, setCoords] = createSignal<Coord>({ x: 0, y: 0 })
const [guesses, setGuesses] = createSignal<Record<string, string>>({})
const [numGuesses, setNumGuesses] = createSignal(0)
const [deadLetters, setDeadLetters] = createSignal<Set<string>>(new Set())
const [modalContent, setModalContent] = createSignal<null | "HELP" | "WIN">(null)

const shareData = {
  title: "Grid Words",
  text: "Wordle in 2D!",
  url: window.location.href
}
const share = async () => {
  try {
    await navigator.share(shareData)
  } catch (_err) { }
}

function Modal(props: { close: () => void, children: JSX.Element }) {
  return (
    <div
      class="fixed inset-0 bg-black/70 z-90 flex items-center justify-center p-4"
      onpointerup={props.close}
    >
      <div
        class="relative bg-white rounl text-neutral-900 text-sm leading-5 rounded-lg p-6 max-w-2xl w-sm max-h-[90vh] overflow-y-auto"
        onpointerup={(e) => e.stopPropagation()}
      >
        <button class="absolute top-2 right-2 bg-neutral-800 text-white px-2 py-1 font-bold" onclick={props.close}>Close</button>
        {props.children}
      </div>
    </div>
  )
}

function Help() {
  const hasTap = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
  return (
    <>

      <h3 class="text-sm font-bold mb-3">HOW TO PLAY</h3>
      <p class="mb-6">Fill in every cell with the right letter to complete the word grid. {hasTap() ? "Tap" : "Click or use arrow keys"} to select a cell, {hasTap() ? "use the keyboard below" : "press any key"} to guess a letter, use backspace to delete.</p>
      <p class="mb-6">Each vertical column and horizontal row makes a complete word (some may be more than one word with no spaces). Cell colors change based on letter placement:</p>

      <div class="space-y-3 mb-6">
        <div class="flex items-center gap-4">
          <Cell guess="E" status={CORRECT} value="" size='sm' />
          Letter is in the right spot
        </div>
        <div class="flex items-center gap-4">
          <Cell guess="E" status={IN_ROW} value="" size='sm' />
          Letter is in this column and/or row but not this spot
        </div>
        <div class="flex items-center gap-4">
          <Cell guess="E" status={IN_PUZZLE} value="" size='sm' />
          Letter is somewhere in the puzzle, but not this column or row
        </div>
        <div class="flex items-center gap-4">
          <Cell guess="E" status={WRONG} value="" size='sm' />
          Letter is not in the puzzle
        </div>
      </div>
    </>
  )
}

function Win() {
  return (
    <>
      <h2 class="text-2xl text-center mb-1">SOLVED!</h2>
      <p class="mb-3">You completed the puzzle in {numGuesses} turns.</p>
      <p>Come back tomorrow for a new puzzle!</p>
    </>
  )
}

function App(props: { puzzle: Puzzle }) {
  const puzzle = props.puzzle

  const move = (dx: number, dy: number, force = false) => {
    const newCoord = {
      x: Math.min(puzzle.ipuz.dimensions.width - 1, Math.max(0, coords().x + dx)),
      y: Math.min(puzzle.ipuz.dimensions.height - 1, Math.max(0, coords().y + dy))
    }
    if (!force && puzzle.valueAt(newCoord) === "#") return
    setCoords(newCoord)
  }
  const guess = (guess: string) => {
    if (puzzle.valueAt(coords()).toLowerCase() === guesses()[coordToString(coords())]) return

    setGuesses((g) => ({ ...g, [coordToString(coords())]: guess }))
    setNumGuesses(numGuesses() + 1)

    if (!letterIsInPuzzleStill(guess, guesses(), puzzle)) setDeadLetters(d => new Set([...d, guess]))

    if (puzzleIsComplete(guesses(), puzzle)) setModalContent("WIN")
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "ArrowUp") {
      move(0, -1)
    } else if (e.code === "ArrowDown") {
      move(0, 1)
    } else if (e.code === "ArrowLeft") {
      move(-1, 0)
    } else if (e.code === "ArrowRight") {
      move(1, 0)
    } else if (e.key >= "a" && e.key <= "z") {
      guess(e.key)
    } else if (e.key === "Backspace") {
      if (puzzle.valueAt(coords()).toLowerCase() === guesses()[coordToString(coords())]) return
      setGuesses((g) => {
        delete g[coordToString(coords())]
        return ({ ...g })
      })
    }
  }

  const hasTap = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)

  let appRef!: HTMLDivElement
  let keyboard: Keyboard | undefined
  const [fullScreen, setFullScreen] = createSignal(false)

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown)
    keyboard = new Keyboard({
      onKeyPress: (button: string) => handleKeyDown(new KeyboardEvent("keydown", button === "{bksp}" ? { code: "Backspace", key: "Backspace" } : { key: button })),
      layout: {
        default: [
          "q w e r t y u i o p",
          "a s d f g h j k l",
          "z x c v b n m {bksp}",
        ],
      },
      display: { '{bksp}': '↤' },
    })
  })
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown))

  createEffect(() => {
    keyboard?.addButtonTheme([...deadLetters()].join(" "), "bg-gray-400!")
  })

  addEventListener("fullscreenchange", () => { if (document.fullscreenElement !== appRef) setFullScreen(false) })

  while (puzzle.valueAt(coords()) === "#") move(1, 0, true)

  return (
    <div ref={appRef} class="bg-neutral-800 h-dvh w-screen overflow-hidden flex flex-col items-center gap-4 p-4">
      <Show when={modalContent()}>
        <Modal close={() => setModalContent(null)}>
          {modalContent() === "HELP" ? <Help /> : <Win />}
        </Modal>
      </Show>
      <Title />
      <div class="flex items-center gap-4">
        <span class="text-neutral-400 text-sm">{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        <button onclick={() => setModalContent("HELP")}>How to play</button>
        <Show when={hasTap() && appRef?.requestFullscreen && !fullScreen()}>
          <button onclick={() => appRef.requestFullscreen().then(() => setFullScreen(true))}>Fullscreen</button>
        </Show>
      </div>
      <div class="grid-wrapper flex-1 min-h-0 flex items-center justify-center w-full">
        <PuzzleGrid coords={coords()} puzzle={puzzle} guesses={guesses()} />
      </div>
      <div class="self-stretch shrink-0 -m-4 mt-auto md:w-md md:self-center">
        <div class="simple-keyboard"></div>
      </div>
    </div>
  )
}

function Title() {
  return <div class={`grid grid-cols-5 grid-rows-2 gap-0 sm:gap-1`} >
    <Cell guess="G" status={CORRECT} value="" size='sm' />
    <Cell guess="R" status={IN_PUZZLE} value="" size='sm' />
    <Cell guess="I" status={IN_ROW} value="" size='sm' />
    <Cell guess="D" status={CORRECT} value="" size='sm' />
    <Cell guess="" status={EMPTY} value="" size='sm' />
    <Cell guess="W" status={IN_PUZZLE} value="" size='sm' />
    <Cell guess="O" status={IN_ROW} value="" size='sm' />
    <Cell guess="R" status={CORRECT} value="" size='sm' />
    <Cell guess="D" status={CORRECT} value="" size='sm' />
    <Cell guess="S" status={CORRECT} value="" size='sm' />
  </div>
}

function PuzzleGrid(props: { coords: Coord, puzzle: Puzzle, guesses: Record<string, string> }) {
  let w = props.puzzle.ipuz.dimensions.width

  let reticleStyles = () => ({
    width: `calc(100% / ${w})`,
    transform: `translate(${100 * props.coords.x}%, ${100 * props.coords.y}%)`
  })

  return <div class={`grid-square relative grid grid-cols-5 grid-rows-5 gap-1`} >
    <div style={reticleStyles()} class="aspect-square absolute rounded-xl border-6 sm:border-8 border-red-400 transition-transform"></div>
    {props.puzzle.ipuz.solution.map((row, y) => row.map((cell, x) => {
      return <Cell
        x={x}
        y={y}
        value={props.puzzle.valueAt({ x, y })}
        status={status(props.guesses, { x, y }, props.puzzle)}
        guess={props.guesses[coordToString({ x, y })]} />
    }))}
  </div>
}

function Cell(props: { x?: number, y?: number, value: string, status: string, guess: string, size?: undefined | "sm" }) {
  const width = props.size == "sm" ? "w-10 sm:w-12" : "auto"
  const fontSize = props.size == "sm" ? "text-2xl sm:text-4xl" : "text-4xl sm:text-6xl"
  return <div
    class={`shrink-0 aspect-square ${width} border-gray-700 border-2 rounded-xl flex items-center justify-center ${props.status}`}
    onClick={() => {
      if (props.x === undefined || props.y === undefined) return
      if (props.value === "#") return
      setCoords({ x: props.x, y: props.y })
    }}
  >
    <Show when={props.value !== "#"}>
      <span class={`text-white uppercase ${fontSize}`}>{props.guess}</span>
    </Show>
  </div>
}

export default App
