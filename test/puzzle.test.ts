import { describe, it, assert, expect, test } from 'vitest'

import Puzzle from '../src/puzzle.ts';

describe('ipuz parsing', () => {

  const ipuz = {
    "version": "http://ipuz.org/v2",
    "kind": ["http://ipuz.org/crossword#1"],
    "dimensions": { "width": 3, "height": 3 },
    "puzzle": [[{ "cell": 1, "style": { "shapebg": "circle" } }, 2, "#"], [3, { "style": { "shapebg": "circle" } }, 4], ["#", 5, { "style": { "shapebg": "circle" } }]],
    "solution": [
      ["C", "A", "#"],
      ["B", "O", "T"],
      ["#", "L", "O"]
    ],
    "clues": { "Across": [[1, "OR neighbor"], [3, "Droid"], [5, "Behold!"]], "Down": [[1, "Trucker's radio"], [2, "MSN competitor"], [4, "A preposition"]] }
  }
  it('iterates only white cells', () => {
    let g = new Puzzle(ipuz)

    expect(g.current).to.equal("C");
    expect(g.next()).to.equal(true)
    expect(g.current).to.equal("A");
    g.next()
    expect(g.current).to.equal("B");
    g.next()
    g.next()
    g.next()
    expect(g.current).to.equal("L");
    expect(g.next()).to.equal(true)
    expect(g.next()).to.equal(false)

  });

  it('starts correct with blank first spot', () => {
    const ipuz = {
      "dimensions": { "width": 3, "height": 3 },
      "solution": [
        ["#", "#", "#"],
        ["B", "O", "T"],
        ["#", "N", "O"]
      ],
    }
    let g = new Puzzle(ipuz)

    expect(g.current).to.equal("B");
  });

  it('gets word prefixes and lenghts by cell', () => {
    // ["C", "A", "#"],
    // ["B", "O", "T"],
    // ["#", "L", "O"]
    let g = new Puzzle(ipuz)
    g.set({ x: 0, y: 0 })
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "C", len: 2 }, { prefix: "C", len: 2 }])

    g.set({ x: 1, y: 0 })
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "CA", len: 2 }, { prefix: "A", len: 3 }])

    g.set({ x: 1, y: 1 })
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "BO", len: 3 }, { prefix: "AO", len: 3 }])

    g.set({ x: 2, y: 1 })
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "BOT", len: 3 }, { prefix: "T", len: 2 }])

    g.set({ x: 1, y: 2 })
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "L", len: 2 }, { prefix: "AOL", len: 3 }])

    const ipuzNonIntersection = {
      "dimensions": { "width": 3, "height": 3 },
      "solution": [
        ["#", "#", "#"],
        ["B", "O", "T"],
        ["#", "N", "O"]
      ],
    }
    g = new Puzzle(ipuzNonIntersection)
    g.set({ x: 0, y: 1 }) // B
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "B", len: 3 }])

    const ipuzTwoWordsOnRow = {
      "dimensions": { "width": 5, "height": 2 },
      "solution": [
        ["N", "O", "#", "I", "T"],
        ["#", "N", "#", "N", "O"]
      ],
    }
    g = new Puzzle(ipuzTwoWordsOnRow)
    g.set({ x: 3, y: 0 }) // I
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "I", len: 2 }, { prefix: "I", len: 2 }])
    g.set({ x: 0, y: 0 }) // I
    expect(g.getPrefixes()).to.deep.equal([{ prefix: "N", len: 2 }])
  })

  test("getWord returns word and index in word for direction and coord", () => {
    // ["C", "A", "#"],
    // ["B", "O", "T"],
    // ["#", "L", "O"]
    let p = new Puzzle(ipuz)
    p.set({ x: 0, y: 0 })
    assert.deepEqual(p.getWord("across"), [["C", "A"], 0])
    p.set({ x: 1, y: 0 })
    assert.deepEqual(p.getWord("across"), [["C", "A"], 1])

    p.set({ x: 0, y: 0 })
    assert.deepEqual(p.getWord("down"), [["C", "B"], 0])
    p.set({ x: 2, y: 1 })
    assert.deepEqual(p.getWord("down"), [["T", "O"], 0])
    p.set({ x: 2, y: 2 })
    assert.deepEqual(p.getWord("down"), [["T", "O"], 1])

    p.set({ x: 1, y: 1 })
    assert.deepEqual(p.getWord("down"), [["A", "O", "L"], 1])
    assert.deepEqual(p.getWord("across"), [["B", "O", "T"], 1])

    p.set({ x: 2, y: 0 })
    assert.deepEqual(p.getWord("down"), [[], -1])
    assert.deepEqual(p.getWord("across"), [[], -1])
  })
});


