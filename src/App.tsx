import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import Puzzle from './puzzle'
import { createStore, produce } from 'solid-js/store'
// 04-08
import ipuz from '../public/puzzles/05.json?raw'

type Coord = { x: number, y: number }

function coordToString({ x, y }: Coord): string {
  return `${x},${y}`
}

const status = (guesses: Record<string, string>, coord: Coord, puzzle: Puzzle) => {
  const guess = guesses[coordToString(coord)]
  if (puzzle.valueAt(coord) === "#") {
    return "bg-gray-700"
  } else if (guess && guess.toLowerCase() === puzzle.valueAt(coord).toLowerCase()) {
    return "bg-green-400"
  } else if (letterIsInRowOrColStill(guesses, coord, puzzle)) {
    return "bg-yellow-400"
  } else if (letterIsInPuzzleStill(guess, guesses, puzzle)) {
    return "bg-indigo-400"
  } else if (guess) {
    return "bg-gray-400"
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
    .flatMap((row, y) => row.filter((cell, x) => !guesses[coordToString({ x, y })]))
    .includes(guess?.toUpperCase())
}

function App() {
  const puzzle = new Puzzle(JSON.parse(ipuz))
  const [showFull, setShowFull] = createSignal(true)
  const [coords, setCoords] = createSignal<Coord>({ x: 0, y: 0 })
  const [guesses, setGuesses] = createSignal<Record<string, string>>({})

  const move = (dx: number, dy: number) => {
    setCoords(coords => ({
      x: Math.min(puzzle.ipuz.dimensions.width - 1, Math.max(0, coords.x + dx)),
      y: Math.min(puzzle.ipuz.dimensions.height - 1, Math.max(0, coords.y + dy))
    }))
  }
  const guess = (guess: string) => {
    if (puzzle.valueAt(coords()).toLowerCase() === guesses()[coordToString(coords())]) return
    setGuesses((g) => ({ ...g, [coordToString(coords())]: guess }))
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
    }
  }

  onMount(() => document.addEventListener("keydown", handleKeyDown))
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown))

  return (
    <>
      <div class="bg-neutral-800 h-screen w-screen overflow-hidden flex justify-center items-center">
        <PuzzleGrid coords={coords()} puzzle={puzzle} showFull={showFull()} guesses={guesses()} />
      </div >
    </>
  )
}

function PuzzleGrid(props: { coords: Coord, puzzle: Puzzle, showFull: boolean, guesses: Record<string, string> }) {
  let w = props.puzzle.ipuz.dimensions.width

  let reticleStyles = () => ({
    width: `calc(100% / ${w})`,
    transform: `translate(${100 * props.coords.x}%, ${100 * props.coords.y}%)`
  })

  return <div
    class={`w-md relative aspect-square grid grid-cols-5 grid-rows-5 gap-1`}
  >
    <div style={reticleStyles()} class="aspect-square absolute rounded-xl border-8 border-red-400 transition-transform"></div>
    {props.puzzle.ipuz.solution.map((row, y) => row.map((cell, x) => {
      return <Cell y={y} x={x}
        value={props.puzzle.valueAt({ x, y })}
        status={status(props.guesses, { x, y }, props.puzzle)}
        guess={props.guesses[coordToString({ x, y })]} />
    }))}
  </div>
}

function Cell(props: { y: number, x: number, value: string, status: string, guess: string }) {
  return <div class={`border-gray-700 border-2 rounded-xl flex items-center justify-center ${props.status}`}>
    <Show when={props.value !== "#"}>
      <span class="text-white uppercase text-6xl">{props.guess}</span>
    </Show>
  </div>
}

export default App
