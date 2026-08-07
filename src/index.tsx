/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'
import Puzzle from './puzzle'
import { getPuzzleId } from './puzzleId'

const loading = document.getElementById('loading')
const root = document.getElementById('root')

fetch(`/puzzles/${getPuzzleId()}.ipuz`)
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
