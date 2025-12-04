import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'
import Puzzle from './puzzle'
import { createStore, produce } from 'solid-js/store'

type Coord = { x: number, y: number }

function makePuzzle(cells: string[][]): Puzzle {
  return new Puzzle({
    "version": "http://ipuz.org/v2",
    "kind": ["http://ipuz.org/crossword#1"],
    "dimensions": { "width": cells[0].length, "height": cells.length },
    "puzzle": [],
    "solution": cells,
  })
}

function toCoord({ x, y }: Coord): string {
  return `${x},${y}`
}

const status = (guesses: Record<string, string>, coord: Coord, puzzle: Puzzle) => {
  const guess = guesses[toCoord(coord)]
  if (puzzle.valueAt(coord) === "#") {
    return "bg-gray-400"
  } else if (guess && guess.toLowerCase() === puzzle.valueAt(coord).toLowerCase()) {
    return "bg-green-400"
  } else if (rightLetterWrongSpot(guesses, coord, puzzle)) {
    return "bg-yellow-400"
  } else {
    return ""
  }
}

const wordToPuzzleCoords = (puzzle: Puzzle, word: string[], wordIndex: number, direction: "down" | "across"): string[] => {
  if (direction === "across") {
    return word.map((_w, i) => toCoord({ x: puzzle.x - wordIndex + i, y: puzzle.y }))
  } else {
    return word.map((_w, i) => toCoord({ x: puzzle.x, y: puzzle.y - wordIndex + i }))
  }
}

const rightLetterWrongSpot = (guesses: Record<string, string>, coord: Coord, puzzle: Puzzle): boolean => {
  // get words from coord
  // get puzzle coords for words
  // get guessees for words' puzzle coords
  // remove correct guesses from words
  // for each word, for each guess up to index of coord in word, if present in word, remove from word
  // if guess in either words' remaining letters, return true, else false
  let [across, down] = puzzle.wordsAt(coord)
  const puzzleCoordsDown = wordToPuzzleCoords(puzzle, across[0], across[1], "across")
  const puzzleCoordsAcross = wordToPuzzleCoords(puzzle, down[0], down[1], "down")
  const guessesAcross = puzzleCoordsDown.map((coord) => guesses[coord])
  const guessesDown = puzzleCoordsAcross.map((coord) => guesses[coord])
  across[0] = across[0].filter((v, i) => v.toLocaleLowerCase() !== guessesAcross[i]?.toLowerCase())
  down[0] = down[0].filter((v, i) => v.toLocaleLowerCase() !== guessesDown[i]?.toLowerCase())
  // TODO coord bug? flashes whwn puzzle.x/y moves, but logic seems right?
  // TODO still: already has right letter wrong spot

  return across[0].concat(down[0]).includes(guesses[toCoord(coord)])
}

function App() {
  const cells = [
    ["t", "h", "i", "s"],
    ["h", "i", "#", "o"],
    ["a", "t", "e", "#"],
    ["t", "#", "h", "i"],
  ]
  const [showFull, setShowFull] = createSignal(true)
  const [puzzle, setPuzzle] = createStore(makePuzzle(cells))
  const [guesses, setGuesses] = createSignal({})

  const toggleZoom = () => setShowFull(!showFull())
  const move = (dx: number, dy: number) => {
    setPuzzle(produce((p) => p.set({
      x: Math.min(puzzle.ipuz.dimensions.width - 1, Math.max(0, puzzle.x + dx)),
      y: Math.min(puzzle.ipuz.dimensions.height - 1, Math.max(0, puzzle.y + dy))
    })))
  }
  const guess = (guess: string) => setGuesses((g) => ({ ...g, [toCoord(puzzle)]: guess }))

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      // crosswordle mode
      // toggleZoom()
      return
    }

    if (showFull()) {
      // crosswordle mode
      // return
    }
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
      <div class="h-screen w-screen overflow-hidden flex justify-center items-center">
        <div class="grid auto-cols-[6rem_auto_6rem] grid-rows-[6rem_auto]">
          <div class={`col-start-2 justify-self-center self-start transition-opacity ${showFull() && "opacity-0"}`}>
            <Word direction="across" word={puzzle.getWord("across")} />
          </div>
          <div class="row-start-2 col-start-2 w-lg aspect-square overflow-hidden p-8">
            <PuzzleGrid puzzle={puzzle} showFull={showFull()} guesses={guesses()} />
          </div >
          <div class={`col-start-3 row-start-2 justify-self-end self-center transition-opacity ${showFull() && "opacity-0"}`}>
            <Word direction="down" word={puzzle.getWord("down")} />
          </div >
        </div>
      </div >
    </>
  )
}

function Word(props: { direction: "down" | "across", word: [string[], number] }) {
  const colors = (i: number) => i === props.word[1] ? "bg-gray-300 text-white" : "text-gray-300"
  return <div class={`text-3xl uppercase flex ${props.direction === "down" ? "flex-col" : "flex-row"}`}>
    {
      props.word[0].map((w, i) =>
        <div class={`w-20 aspect-square border-2 border-gray-400 flex items-center justify-center ${colors(i)}`}>
          <span>{w}</span>
        </div>)
    }
  </div>
}

function PuzzleGrid(props: { puzzle: Puzzle, showFull: boolean, guesses: Record<string, string> }) {
  let w = props.puzzle.ipuz.dimensions.width
  let h = props.puzzle.ipuz.dimensions.height

  let styles = () => ({
    width: `calc(100% * ${w})`,
    height: `calc(100% * ${h})`,
    transform: props.showFull
      ? `scale(${1 / Math.max(w, h)})`
      : `translate(-${100 * props.puzzle.x / w}%, -${100 * props.puzzle.y / h}%)`,
  })

  let targetStyles = () => ({
    width: `calc(100% / ${w})`,
    transform: `translate(${100 * props.puzzle.x}%, ${100 * props.puzzle.y}%)`
  })

  return <div
    style={styles()}
    class="text-violet-800 grid grid-cols-4 grid-rows-4 gap-8 transition-transform duration-300 origin-top-left"
  >
    <div style={targetStyles()} class="aspect-square absolute rounded-3xl border-18 border-red-400 transition-transform">0</div>
    {props.puzzle.ipuz.solution.map((row, y) => row.map((cell, x) => {
      return <Cell y={y} x={x}
        value={props.puzzle.valueAt({ x, y })}
        status={status(props.guesses, { x, y }, props.puzzle)}
        guess={props.guesses[toCoord({ x, y })]} />
    }))}
  </div>
}

function Cell(props: { y: number, x: number, value: string, status: string, guess: string }) {
  return <div class={`border-gray-400 border-2 rounded-3xl flex items-center justify-center ${props.status}`}>
    <Show when={props.value !== "#"}>
      <span class="text-black dark:text-white uppercase text-9xl">{props.guess}/{props.value}</span>
    </Show>
  </div>
}

export default App
