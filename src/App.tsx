import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { createEffect } from 'solid-js'

function App() {
  const [showFull, setShowFull] = createSignal(false)
  const [offset, setOffset] = createSignal({ x: 0, y: 0 })

  const puzzle = [
    ["t", "h", "i", "s"],
    ["h", "i", "#", "o"],
    ["a", "g", "e", "#"],
    ["t", "h", "#", "#"],
  ]

  const toggleZoom = () => setShowFull(!showFull())
  const move = (x: number, y: number) => setOffset(offset => ({
    x: Math.min(puzzle[0].length - 1, Math.max(0, offset.x + x)),
    y: Math.min(puzzle.length - 1, Math.max(0, offset.y + y))
  }))


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

  // TODO get Word data from ipuzz (correct length + active index)

  return (
    <>
      <div class="h-screen w-screen overflow-hidden flex justify-center items-center">
        <div class="grid auto-cols-[6rem_auto_6rem] grid-rows-[6rem_auto]">
          <div class={`col-start-2 justify-self-center self-start transition-opacity ${showFull() && "opacity-0"}`}>
            <Word direction="across" word={puzzle[offset().y]} index={offset().x} />
          </div>
          <div class="row-start-2 col-start-2 w-lg aspect-square overflow-hidden p-8">
            <Puzzle offset={offset()} showFull={showFull()} puzzle={puzzle} />
          </div >
          <div class={`col-start-3 row-start-2 justify-self-end self-center transition-opacity ${showFull() && "opacity-0"}`}>
            <Word direction="down" word={puzzle.map(row => row[offset().x])} index={offset().y} />
          </div >
        </div>
      </div >
    </>
  )
}

function Word(props: { direction: "down" | "across", word: string[], index: number }) {
  const colors = (i: number) => i === props.index ? "bg-gray-300 text-white" : "text-gray-300"
  return <div class={`text-3xl uppercase flex ${props.direction === "down" ? "flex-col" : "flex-row"}`}>
    {
      props.word.map((w, i) =>
        <div class={`w-20 aspect-square border-2 border-gray-300 flex items-center justify-center ${colors(i)}`}>
          <span>{w}</span>
        </div>)
    }
  </div>
}

function Puzzle(props: { offset: { x: number, y: number }, showFull: boolean, puzzle: string[][] }) {
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
