type Ipuz = { "dimensions": { "width": number, "height": number }, "solution": string[][], [key: string]: any; }

export default class Puzzle {
  puzzle: Ipuz
  current: string
  x: number = 0
  y: number = 0

  constructor(ipuz: Ipuz) {
    this.puzzle = ipuz
    if (!this.valid()) this.next()
    this.current = this.puzzle.solution[this.y][this.x]
  }

  getPrefixes(): Array<{ prefix: string, len: number }> {
    let { height, width } = this.puzzle.dimensions

    let across = ""
    let acrossLen = 0
    for (let x = this.x; x >= 0 && this.puzzle.solution[this.y][x] !== "#"; x--) {
      across = this.puzzle.solution[this.y][x] + across
      acrossLen++
    }
    for (let x = this.x + 1; x < width && this.puzzle.solution[this.y][x] !== "#"; x++) {
      acrossLen++
    }

    let down = ""
    let downLen = 0
    for (let y = this.y; y >= 0 && this.puzzle.solution[y][this.x] !== "#"; y--) {
      down = this.puzzle.solution[y][this.x] + down
      downLen++
    }
    for (let y = this.y + 1; y < height && this.puzzle.solution[y][this.x] !== "#"; y++) {
      downLen++
    }
    return [{ prefix: across, len: acrossLen }, { prefix: down, len: downLen }]
      .filter(({ len }) => len > 1)
  }

  getWord(direction: "across" | "down"): [string[], number] {
    if (this.current === "#") return [[], -1]

    let word = [this.current]
    let i = 0
    if (direction === "across") {
      let x = this.x + 1
      while (x < this.puzzle.dimensions.width && this.puzzle.solution[this.y][x] !== "#") {
        word.push(this.puzzle.solution[this.y][x])
        x++
      }
      x = this.x - 1
      while (x >= 0 && this.puzzle.solution[this.y][x] !== "#") {
        word.unshift(this.puzzle.solution[this.y][x])
        x--
        i++
      }
    } else {

      let y = this.y + 1
      while (y < this.puzzle.dimensions.height && this.puzzle.solution[y][this.x] !== "#") {
        word.push(this.puzzle.solution[y][this.x])
        y++
      }
      y = this.y - 1
      while (y >= 0 && this.puzzle.solution[y][this.x] !== "#") {
        word.unshift(this.puzzle.solution[y][this.x])
        y--
        i++
      }
    }
    return [word, i]
  }

  next(): boolean {
    this.x++
    if (this.x > this.puzzle.dimensions.width - 1) {
      this.x = 0
      this.y++
    }
    if (this.y > this.puzzle.dimensions.height - 1) return false
    if (!this.valid()) return this.next()
    this.current = this.puzzle.solution[this.y][this.x]
    return true
  }

  set({ x, y }: { x: number, y: number }) {
    this.x = x
    this.y = y
    this.current = this.puzzle.solution[this.y][this.x]
  }

  valid(): boolean {
    return this.puzzle.solution[this.y][this.x] !== "#"
  }

}
