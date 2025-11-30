import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import Puzzle from './puzzle'
import { createStore, produce } from 'solid-js/store'

function makePuzzle(cells: string[][]): Puzzle {
  return new Puzzle({
    "version": "http://ipuz.org/v2",
    "kind": ["http://ipuz.org/crossword#1"],
    "dimensions": { "width": cells[0].length, "height": cells.length },
    "puzzle": [],
    "solution": cells,
  })
}

function App() {
  const cells = [
    ["t", "h", "i", "s"],
    ["h", "i", "#", "o"],
    ["a", "g", "e", "#"],
    ["t", "h", "#", "#"],
  ]
  const [showFull, setShowFull] = createSignal(false)
  const [puzzle, setPuzzle] = createStore(makePuzzle(cells))

  const toggleZoom = () => setShowFull(!showFull())
  const move = (x: number, y: number) => {
    setPuzzle(produce((p) => p.set({
      x: Math.min(puzzle.puzzle.solution[0].length - 1, Math.max(0, puzzle.x + x)),
      y: Math.min(puzzle.puzzle.solution.length - 1, Math.max(0, puzzle.y + y))
    })))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      toggleZoom()
      return
    }

    if (showFull()) {
      return
    } else if (e.code === "ArrowUp") {
      move(0, -1)
    } else if (e.code === "ArrowDown") {
      move(0, 1)
    } else if (e.code === "ArrowLeft") {
      move(-1, 0)
    } else if (e.code === "ArrowRight") {
      move(1, 0)
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
            <PuzzleGrid offset={puzzle} showFull={showFull()} puzzle={cells} />
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
        <div class={`w-20 aspect-square border-2 border-gray-300 flex items-center justify-center ${colors(i)}`}>
          <span>{w}</span>
        </div>)
    }
  </div>
}

function PuzzleGrid(props: { offset: { x: number, y: number }, showFull: boolean, puzzle: string[][] }) {
  let w = () => props.puzzle[0].length
  let h = () => props.puzzle.length


  let styles = () => ({
    width: `calc(100% * ${w()})`,
    height: `calc(100% * ${h()})`,
    transform: props.showFull ? `scale(${1 / Math.max(w(), h())})` : `translate(-${100 * props.offset.x / w()}%, -${100 * props.offset.y / h()}%)`,
  })

  return <div
    style={styles()}
    class="text-violet-800 grid grid-cols-4 gap-8 transition-transform duration-300 origin-top-left"
  >
    {props.puzzle.map((row, r) => row.map((cell, c) => {
      return <Cell r={r} c={c} value={cell} />
    }))}
  </div>
}

function Cell(props: { r: number, c: number, value: string }) {
  return <div class={`cell  border-gray-300 border-2 rounded-3xl flex items-center justify-center ${props.value === "#" && "bg-gray-300"}`}>
    <Show when={props.value !== "#"}>
      <span class="text-gray-300 uppercase text-9xl">{props.value}</span>
    </Show>
  </div>
}

export default App
