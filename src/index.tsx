/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'
import Puzzle from './puzzle'

const loading = document.getElementById('loading')
const root = document.getElementById('root')

function getYearAgoPuzzleUrl() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `https://games-service-prod.site.aws.wapo.pub/crossword/levels/mini/${yyyy}/${mm}/${dd}`
}

function wapoPuzzleToIpuz(data: any) {
  const size = data.width
  const solution: string[][] = []
  for (let y = 0; y < size; y++) {
    const row: string[] = []
    for (let x = 0; x < size; x++) {
      const cell = data.cells[y * size + x]
      row.push(cell.type === "locked" ? "#" : cell.answer)
    }
    solution.push(row)
  }
  return { dimensions: { width: size, height: size }, solution }
}

fetch(getYearAgoPuzzleUrl())
  .then(res => res.json())
  .then(data => {
    const ipuz = wapoPuzzleToIpuz(data)
    const puzzle = new Puzzle(ipuz)
    loading!.style.display = "none"
    render(() => <App puzzle={puzzle} />, root!)
  })
  .catch(e => {
    loading!.innerText = `Puzzle not found.`
    console.error(e)
  })
