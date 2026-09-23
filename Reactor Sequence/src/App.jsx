import { useCallback, useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import TimerPage from './pages/TimerPage'
import MainGamePage from './pages/MainGamePage'
import FinalPage from './pages/FinalPage'
import { ALL_IMAGES } from './assets'

// Page flow: home page bg -> timer bg -> main game bg -> final bg -> home page bg
export default function App() {
  const [page, setPage] = useState('home page bg')
  const [roundsCompleted, setRoundsCompleted] = useState(0)

  // Preload every image so page switches and the kill animation never flash.
  useEffect(() => {
    ALL_IMAGES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  const goTimer = useCallback(() => setPage('timer bg'), [])
  const goGame = useCallback(() => setPage('main game bg'), [])
  const goFinal = useCallback((completed) => {
    setRoundsCompleted(completed)
    setPage('final bg')
  }, [])
  const goHome = useCallback(() => setPage('home page bg'), [])

  switch (page) {
    case 'timer bg':
      return <TimerPage onDone={goGame} />
    case 'main game bg':
      return <MainGamePage onFinish={goFinal} />
    case 'final bg':
      return <FinalPage roundsCompleted={roundsCompleted} onHome={goHome} />
    default:
      return <HomePage onStart={goTimer} />
  }
}
