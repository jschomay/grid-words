import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'
import Puzzle from './puzzle'
import { createStore } from 'solid-js/store'
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


const status = (guesses: Record<string, string[]>, coord: Coord, puzzle: Puzzle): string[] => {
  return guesses[coordToString(coord)]?.map(guess => {
    if (puzzle.valueAt(coord) === "#") {
      return EMPTY
    } else if (guess.toLowerCase() === puzzle.valueAt(coord).toLowerCase()) {
      return CORRECT
    } else if (letterIsInRowOrColStill(guess, guesses, coord, puzzle)) {
      return IN_ROW
    } else if (letterIsInPuzzleStill(guess, guesses, puzzle)) {
      return IN_PUZZLE
    } else if (guess) {
      return WRONG
    } else {
      return "bg-white"
    }
  })
}

const wordToPuzzleCoords = (coord: Coord, word: string[], wordIndex: number, direction: "down" | "across"): string[] => {
  if (direction === "across") {
    return word.map((_w, i) => coordToString({ x: coord.x - wordIndex + i, y: coord.y }))
  } else {
    return word.map((_w, i) => coordToString({ x: coord.x, y: coord.y - wordIndex + i }))
  }
}

const letterIsInRowOrColStill = (guess: string, guesses: Record<string, string[]>, coord: Coord, puzzle: Puzzle): boolean => {
  let [across, down] = puzzle.wordsAt(coord)
  across[0] = across[0].map(c => c.toLowerCase())
  down[0] = down[0].map(c => c.toLowerCase())
  const puzzleCoordsDown = wordToPuzzleCoords(coord, across[0], across[1], "across")
  const puzzleCoordsAcross = wordToPuzzleCoords(coord, down[0], down[1], "down")
  const guessesAcross = puzzleCoordsDown.map((coord) => guesses[coord])
  const guessesDown = puzzleCoordsAcross.map((coord) => guesses[coord])

  const redacted = "$"

  // remove correct guess from words
  across[0] = across[0].map((v, i) => guessesAcross[i]?.includes(v) ? redacted : v)
  down[0] = down[0].map((v, i) => guessesDown[i]?.includes(v) ? redacted : v)

  return across[0].concat(down[0]).includes(guess)
}

const letterIsInPuzzleStill = (guess: string, guesses: Record<string, string[]>, puzzle: Puzzle) => {
  return puzzle.ipuz.solution
    .flatMap((row, y) => row.filter((cell, x) => {
      let cellGuessStack = guesses[coordToString({ x, y })]
      return !cellGuessStack?.includes(cell.toLowerCase())
    }))
    .includes(guess?.toUpperCase())
}

const puzzleIsComplete = (guesses: Record<string, string[]>, puzzle: Puzzle) => {
  return puzzle.ipuz.solution
    .flatMap((row, y) => row.map((cell, x) => {
      let cellGuessStack = guesses[coordToString({ x, y })]
      return cell === "#" || cellGuessStack?.[cellGuessStack.length - 1]?.toLowerCase() === cell.toLowerCase()
    }))
    .every(x => x)
}

const [coords, setCoords] = createSignal<Coord>({ x: 0, y: 0 })
const [stackOffset, setStackOffset] = createSignal(0)
const [guesses, setGuesses] = createSignal<Record<string, string[]>>({})
const [numGuesses, setNumGuesses] = createStore<number[][]>([[0]])
const [solved, setSolved] = createSignal(false)
const [letterState, setletterState] = createSignal<Map<string, "LIVE" | "DEAD">>(new Map())
const [modalContent, setModalContent] = createSignal<null | "HELP" | "WIN">(null)
const [score, setScore] = createSignal<number>(0)

function Modal(props: { close: () => void, children: JSX.Element }) {
  return (
    <div
      class="fixed inset-0 bg-black/70 z-90 flex items-center justify-center p-4"
      onpointerdown={props.close}
    >
      <div
        class="relative bg-white rounl text-neutral-900 text-sm leading-5 rounded-lg p-6 max-w-2xl w-sm max-h-[90vh] overflow-y-auto"
        onpointerdown={(e) => e.stopPropagation()}
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
      <p class="mb-6 italic">Sudoku meets Wordle meets crosswords.</p>
      <h3 class="text-sm font-bold mb-3">Goal</h3>
      <p class="mb-6">Fill in every cell with the right letter to complete the word grid.</p>
      <p class="mb-6">Each vertical column and horizontal row makes a complete word (some may be more than one word with no spaces or an abbreviation).</p>

      <h3 class="text-sm font-bold mb-3">Controls</h3>
      <p class="mb-6">{hasTap() ? "Tap any cell" : "Click on any cell or use arrow keys"} to select it.  Use the visual keyboard {!hasTap() ? "or press any key" : ""} to fill the cell with that letter.</p>

      <h3 class="text-sm font-bold mb-3">Clues</h3>
      <p class="mb-6"> Cell colors change based on letter placement:</p>
      <div class="space-y-3 mb-6">
        <div class="flex items-center gap-4">
          <Cell guess={["E"]} status={[CORRECT]} value="" size='sm' />
          Letter is in the right spot.
        </div>
        <div class="flex items-center gap-4">
          <Cell guess={["E"]} status={[IN_ROW]} value="" size='sm' />
          Letter is in this column and/or row but not this spot.
        </div>
        <div class="flex items-center gap-4">
          <Cell guess={["E"]} status={[IN_PUZZLE]} value="" size='sm' />
          Letter is somewhere in the puzzle, but not this column or row.
        </div>
        <div class="flex items-center gap-4">
          <Cell guess={["E"]} status={[WRONG]} value="" size='sm' />
          Letter is not in the puzzle.
        </div>
      </div>

      <h3 class="text-sm font-bold mb-3">KEYBOARD</h3>
      <p class="mb-6">
        Guessed letters in the keyboard turn yellow or gray depending on if that letter is stil somewhere in the puzzle or not.
      </p>

      <h3 class="text-sm font-bold mb-3">STACKS</h3>
      <div class="flex items-center gap-4 mb-3">
        <Cell guess={["A", "T", "E"]} status={[WRONG, IN_ROW, CORRECT]} value="" size='sm' />
        Every guess you make in a cell stacks on top of your previous ones.
      </div>
      <p class="mb-6">
        Your latest guess sits on top. {hasTap() ? "Tap" : "Click"} the selected cell again to rotate the stack and see letters that got covered up.
      </p>
    </>
  )
}

function Win() {
  let value = n => {
    if (n === 0) return "⬜"
    if (n < 2) return "🟩" // first try
    if (n < 4) return "🟨" // 2-3
    return "⬛" // 4+
  }
  let turns = numGuesses.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0)
  let usedLetters = Object.keys(letterState()).length
  let viz = numGuesses.map(row => row.map(value).join("")).join("\n")
  let shareText = [
    `Grid Words ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
    `Score: ${score()}. Solved in ${turns} turns, using ${usedLetters} letters.`,
    viz
  ].join("\n")

  const [shareLabel, setShareLabel] = createSignal("Share")
  const share = async () => {
    const shareData = { title: "Grid Words", text: shareText + "\n", url: window.location.href }
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      await navigator.share(shareData)
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
        setShareLabel("Copied!")
        setTimeout(() => setShareLabel("Share"), 2000)
      } catch (_err) {
        setShareLabel("Copy failed")
      }
    }
  }

  return (
    <div class="flex flex-col items-center">
      <h2 class="text-2xl text-center mb-1">PUZZLE COMPLETE!</h2>
      <p class="mb-3">Score: {score()}. Solved in {turns} turns, using {usedLetters} letters.</p>
      <pre>{viz}</pre>
      <span class="mt-2"></span>
      <button onclick={share}>{shareLabel()}</button>
      <p class="mt-3">Come back tomorrow for a new puzzle!</p>
    </div>
  )
}

function App(props: { puzzle: Puzzle }) {
  const puzzle = props.puzzle
  setNumGuesses(puzzle.ipuz.solution.map(row => row.map(() => 0)))

  const move = (dx: number, dy: number, force = false) => {
    const newCoord = {
      x: Math.min(puzzle.ipuz.dimensions.width - 1, Math.max(0, coords().x + dx)),
      y: Math.min(puzzle.ipuz.dimensions.height - 1, Math.max(0, coords().y + dy))
    }
    if (!force && puzzle.valueAt(newCoord) === "#") return
    setCoords(newCoord)
    setStackOffset(0)
  }
  const guess = (guess: string) => {
    let cellGuessStack = guesses()[coordToString(coords())] || []
    // no-op if this letter has already been guessed in this cell
    if (cellGuessStack.includes(guess)) return
    // NOTE might be strange when typing a letter burried in the stack and nothing will happen
    if (cellGuessStack.includes(puzzle.valueAt(coords()).toLowerCase())) return

    setGuesses((g) => ({ ...g, [coordToString(coords())]: [...cellGuessStack, guess] }))
    setStackOffset(0)
    setNumGuesses(coords().y, coords().x, n => n + 1)

    if (puzzle.valueAt(coords()).toLowerCase() === guess) {
      let tries = numGuesses[coords().y][coords().x]
      let points = [100, 50, 25, 10][tries - 1] || 0
      setScore(s => s += points)
    }

    setletterState(s => ({ ...s, [guess]: letterIsInPuzzleStill(guess, guesses(), puzzle) ? "LIVE" : "DEAD" }))

    if (puzzleIsComplete(guesses(), puzzle)) {
      setModalContent("WIN")
      setSolved(true)
    }
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
      // NOTE remove backspace bc what does that mean in a stack?
      // } else if (e.key === "Backspace") {
      //   if (puzzle.valueAt(coords()).toLowerCase() === guesses()[coordToString(coords())]) return
      //   setGuesses((g) => {
      //     delete g[coordToString(coords())]
      //     return ({ ...g })
      //   })
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
          // NOTE backspace removed with stack of guesses
          // "z x c v b n m {bksp}",
          "z x c v b n m",
        ],
      },
      display: { '{bksp}': '↤' },
    })
  })
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown))

  createEffect(() => {
    let deadLetters = [...Object.entries(letterState())].filter(([k, v]) => v === "DEAD").map(([k, v]) => k).join(" ")
    let liveLetters = [...Object.entries(letterState())].filter(([k, v]) => v === "LIVE").map(([k, v]) => k).join(" ")
    keyboard?.addButtonTheme(liveLetters, "bg-yellow-400!")
    keyboard?.removeButtonTheme(deadLetters, "bg-yellow-400!")
    keyboard?.addButtonTheme(deadLetters, "bg-gray-400!")
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
        <Show when={solved()} fallback={<span>Score: {score()}</span>}> <button onclick={() => setModalContent("WIN")}>Show score</button> </Show>
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
    <Cell guess={["G"]} status={[CORRECT]} value="" size='sm' />
    <Cell guess={["R"]} status={[IN_PUZZLE]} value="" size='sm' />
    <Cell guess={["I"]} status={[IN_ROW]} value="" size='sm' />
    <Cell guess={["D"]} status={[CORRECT]} value="" size='sm' />
    <Cell guess={[""]} status={[EMPTY]} value="" size='sm' />
    <Cell guess={["W"]} status={[IN_PUZZLE]} value="" size='sm' />
    <Cell guess={["O"]} status={[IN_ROW]} value="" size='sm' />
    <Cell guess={["R"]} status={[CORRECT]} value="" size='sm' />
    <Cell guess={["D"]} status={[CORRECT]} value="" size='sm' />
    <Cell guess={["S"]} status={[CORRECT]} value="" size='sm' />
  </div>
}

function PuzzleGrid(props: { coords: Coord, puzzle: Puzzle, guesses: Record<string, string[]> }) {
  let w = props.puzzle.ipuz.dimensions.width


  let reticleStyles = () => {
    let numGuesses = props.guesses[coordToString(props.coords)]?.length || 0
    return {
      width: `calc(100% / ${w})`,
      transform: `translate(calc(${100 * props.coords.x}% + -3*${numGuesses}px), calc(${100 * props.coords.y}% + -3*${numGuesses}px)`
    }
  }

  return <div class={`grid-square relative grid grid-cols-5 grid-rows-5 gap-1`} >
    {props.puzzle.ipuz.solution.map((row, y) => row.map((cell, x) => {
      return <Cell
        x={x}
        y={y}
        value={props.puzzle.valueAt({ x, y })}
        status={status(props.guesses, { x, y }, props.puzzle)}
        guess={props.guesses[coordToString({ x, y })]} />
    }))}
    <div style={reticleStyles()} class="pointer-events-none aspect-square absolute rounded-xl border-6 sm:border-8 border-red-400 transition-transform"></div>
  </div>
}

function Cell(props: { x?: number, y?: number, value: string, status: string[], guess: string[], size?: undefined | "sm" }) {
  const width = props.size == "sm" ? "w-10 sm:w-12" : "auto"
  const fontSize = props.size == "sm" ? "text-2xl sm:text-4xl" : "text-4xl sm:text-6xl"
  const isSelected = () => coords().x === props.x && coords().y === props.y
  // rotate this cell's stack when it's selected and the user has clicked through it
  const offset = () => (isSelected() && props.guess?.length ? stackOffset() % props.guess.length : 0)
  return (
    <div
      onClick={() => {
        if (props.x === undefined || props.y === undefined) return
        if (props.value === "#") return
        if (isSelected()) {
          // clicking the already-selected cell rotates its guess stack
          setStackOffset((o) => o + 1)
        } else {
          setCoords({ x: props.x, y: props.y })
          setStackOffset(0)
        }
      }}
      class={`relative shrink-0 aspect-square ${width} rounded-xl ${props.value === "#" ? EMPTY : "bg-white"}`}
    >
      {props.guess?.map((_g, i) => {
        // i is the visual layer; pull the guess that should sit there after rotating
        const idx = (i - offset() + props.guess.length) % props.guess.length
        return (
          <div
            class={`absolute w-full h-full top-0 left-0 border-gray-700 border-1 rounded-xl flex items-center justify-center ${props.status[idx]}`}
            style={{ transform: `translate(${i * -3}px, ${i * -3}px)` }}
          >
            <Show when={props.value !== "#"}>
              <span class={`text-white uppercase ${fontSize}`}>{props.guess[idx]}</span>
            </Show>
          </div>
        )
      })}
    </div>)

}

export default App
