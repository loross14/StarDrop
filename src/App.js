import React, { useState, useEffect, useRef } from 'react';
import PlinkoBoard from './components/PlinkoBoard';
import { useAbstractWallet } from './hooks/useAbstractWallet';
import './App.css';

function App() {
  const [wager, setWager] = useState(0.001);
  const [muteEffects, setMuteEffects] = useState(false);
  const themeRef = useRef(null);
  const { wallet, balance, tickets, connectAGW, connectEOA, sessionKey, signer, isEOA, updateBalance, dropBall } = useAbstractWallet();

  useEffect(() => {
    const audio = new Audio('/sounds/stardrop-theme.mp3');
    audio.loop = true;
    themeRef.current = audio;

    if (!muteEffects) {
      audio.play().catch((error) => {
        console.error('Audio play failed:', error);
      });
    }

    return () => {
      if (themeRef.current) {
        themeRef.current.pause();
        themeRef.current.currentTime = 0;
      }
    };
  }, [muteEffects]);

  const handleDropResult = (result) => {
    updateBalance(result.payout, result.tickets);
  };

  const toggleEffects = () => {
    setMuteEffects((prev) => {
      if (themeRef.current) {
        if (!prev) {
          themeRef.current.pause();
        } else {
          themeRef.current.play().catch((error) => console.error('Audio play failed:', error));
        }
      }
      return !prev;
    });
  };

  return (
    <div className="stardrop-app">
      <header>
        <h1>StarDrop</h1>
      </header>
      <main>
        {!wallet ? (
          <div>
            <button onClick={connectAGW}>Sign In (AGW)</button>
            <button onClick={connectEOA}>Connect MetaMask (EOA)</button>
          </div>
        ) : (
          <>
            <div className="audio-controls">
              <button onClick={toggleEffects}>{muteEffects ? 'Unmute FX' : 'Mute FX'}</button>
            </div>
            <p>Wallet: {wallet.address} ({isEOA ? 'EOA' : 'AGW'})</p>
            <p>Balance: {balance.toFixed(4)} ETH | Tickets: {tickets}</p>
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(parseFloat(e.target.value))}
              step="0.001"
              min="0.001"
              max={balance}
            />
            <PlinkoBoard
              wager={wager}
              sessionKey={isEOA ? signer : sessionKey} // Pass signer for EOA, sessionKey for AGW
              onResult={handleDropResult}
              dropBall={dropBall}
              muteEffects={muteEffects}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;