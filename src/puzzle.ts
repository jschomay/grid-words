type Ipuz = { "dimensions": { "width": number, "height": number }, "solution": string[][], [key: string]: any; }

export default class Puzzle {
  ipuz: Ipuz
  current: string
  x: number = 0
  y: number = 0

  constructor(ipuz: Ipuz) {
    this.ipuz = ipuz
    if (!this.valid()) this.next()
    this.current = this.ipuz.solution[this.y][this.x]
  }

  valueAt(coords: { x: number, y: number }): string {
    return this.ipuz.solution[coords.y][coords.x]
  }

  wordsAt(coord: { x: number, y: number }): [string[], number][] {
    const a = this.getWord_("across", coord)
    const d = this.getWord_("down", coord)
    return [a, d]
  }

  getPrefixes(): Array<{ prefix: string, len: number }> {
    let { height, width } = this.ipuz.dimensions

    let across = ""
    let acrossLen = 0
    for (let x = this.x; x >= 0 && this.ipuz.solution[this.y][x] !== "#"; x--) {
      across = this.ipuz.solution[this.y][x] + across
      acrossLen++
    }
    for (let x = this.x + 1; x < width && this.ipuz.solution[this.y][x] !== "#"; x++) {
      acrossLen++
    }

    let down = ""
    let downLen = 0
    for (let y = this.y; y >= 0 && this.ipuz.solution[y][this.x] !== "#"; y--) {
      down = this.ipuz.solution[y][this.x] + down
      downLen++
    }
    for (let y = this.y + 1; y < height && this.ipuz.solution[y][this.x] !== "#"; y++) {
      downLen++
    }
    return [{ prefix: across, len: acrossLen }, { prefix: down, len: downLen }]
      .filter(({ len }) => len > 1)
  }

  getWord(direction: "across" | "down"): [string[], number] {
    return this.getWord_(direction, { x: this.x, y: this.y })
  }
  getWord_(direction: "across" | "down", coord: { x: number, y: number }): [string[], number] {
    const current = this.valueAt(coord)
    if (current === "#") return [[], -1]

    let word = [current]
    let i = 0
    if (direction === "across") {
      let x = coord.x + 1
      while (x < this.ipuz.dimensions.width && this.ipuz.solution[coord.y][x] !== "#") {
        word.push(this.ipuz.solution[coord.y][x])
        x++
      }
      x = coord.x - 1
      while (x >= 0 && this.ipuz.solution[coord.y][x] !== "#") {
        word.unshift(this.ipuz.solution[coord.y][x])
        x--
        i++
      }
    } else {

      let y = coord.y + 1
      while (y < this.ipuz.dimensions.height && this.ipuz.solution[y][coord.x] !== "#") {
        word.push(this.ipuz.solution[y][coord.x])
        y++
      }
      y = coord.y - 1
      while (y >= 0 && this.ipuz.solution[y][coord.x] !== "#") {
        word.unshift(this.ipuz.solution[y][coord.x])
        y--
        i++
      }
    }
    return word.length > 1 ? [word, i] : [[], -1]
  }

  next(): boolean {
    this.x++
    if (this.x > this.ipuz.dimensions.width - 1) {
      this.x = 0
      this.y++
    }
    if (this.y > this.ipuz.dimensions.height - 1) return false
    if (!this.valid()) return this.next()
    this.current = this.ipuz.solution[this.y][this.x]
    return true
  }

  set({ x, y }: { x: number, y: number }) {
    this.x = x
    this.y = y
    this.current = this.ipuz.solution[this.y][this.x]
  }

  valid(): boolean {
    return this.ipuz.solution[this.y][this.x] !== "#"
  }

}
