/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'
import Puzzle from './puzzle'

const loading = document.getElementById('loading')
const root = document.getElementById('root')

const BASE = Date.UTC(2026, 6, 16)
const DAY = 86_400_000

function getPuzzleIndex(): number {
  return Math.floor((new Date().setHours(0, 0, 0, 0) - BASE) / DAY) % 300
}

fetch(`/puzzles/${getPuzzleIndex() + 1}.ipuz`)
  .then(r => r.json())
  .then(data => {
    const puzzle = new Puzzle(data)
    loading!.style.display = "none"
    render(() => <App puzzle={puzzle} />, root!)
  })
  .catch(e => {
    loading!.innerText = `Error fetching puzzle`
    console.error(e)
  })
