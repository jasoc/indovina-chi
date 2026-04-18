import { useGame } from './contexts/GameContext';
import HomeScreen  from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import GameBoard   from './components/GameBoard';
import Toast       from './components/Toast';

export default function App() {
  const { phase } = useGame();

  return (
    <>
      {/* Toast overlay – sempre visibile */}
      <Toast />

      {/* Router basato sullo stato */}
      {phase === 'home'                         && <HomeScreen  />}
      {phase === 'lobby'                        && <LobbyScreen />}
      {(phase === 'game' || phase === 'gameover') && <GameBoard   />}
    </>
  );
}
