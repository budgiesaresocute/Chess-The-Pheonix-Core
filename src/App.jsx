import React, { useState } from 'react';
import MainMenu from './pages/MainMenu';
import NormalChess from './pages/NormalChess';
import PhoenixCore from './pages/PhoenixCore';

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [timerMode, setTimerMode] = useState(null);

  const goMenu = () => setScreen('menu');

  const handlePlayNormal = (timer) => {
    setTimerMode(timer);
    setScreen('normal');
  };

  const handlePlayPhoenix = (timer) => {
    setTimerMode(timer);
    setScreen('phoenix');
  };

  if (screen === 'normal') return <NormalChess timerMode={timerMode} onBack={goMenu} />;
  if (screen === 'phoenix') return <PhoenixCore timerMode={timerMode} onBack={goMenu} />;
  return <MainMenu onPlayNormal={handlePlayNormal} onPlayPhoenix={handlePlayPhoenix} />;
}
