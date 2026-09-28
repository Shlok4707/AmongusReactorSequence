import Stage from '../components/Stage'
import NeonButton from '../components/NeonButton'

// Page 1 — "home page bg"
export default function HomePage({ onStart }) {
  return (
    <Stage name="home page bg">
      <NeonButton onClick={onStart} style={{ left: '51.3%', top: '76%' }}>
        Start Game
      </NeonButton>
    </Stage>
  )
}
