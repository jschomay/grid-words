/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'
import Puzzle from './puzzle'

const loading = document.getElementById('loading')
const root = document.getElementById('root')

const today = new Date()

function getYearAgoPuzzleUrl(yearsAgo: number) {
  const yyyy = today.getFullYear() - yearsAgo
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
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

function fetchPuzzle(yearsAgo: number) {
  fetch(getYearAgoPuzzleUrl(yearsAgo))
    .then(res => res.json())
    .then(data => {
      const ipuz = wapoPuzzleToIpuz(data)
      const puzzle = new Puzzle(ipuz)
      loading!.style.display = "none"
      render(() => <App puzzle={puzzle} />, root!)
    })
    .catch(e => {
      loading!.innerText = `Error fetching puzzle`
      console.error(e)
      if (yearsAgo > 0) {
        fetchPuzzle(0)
      }
    })
}

fetchPuzzle(1)
