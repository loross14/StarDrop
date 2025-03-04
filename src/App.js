import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import PlinkoBoard from './components/PlinkoBoard';
import { useAbstractWallet } from './hooks/useAbstractWallet';

function App() {
  const [wager, setWager] = useState(0.001);
  const [muteEffects, setMuteEffects] = useState(false);
  const [muteTheme, setMuteTheme] = useState(false);
  const [dropHandler, setDropHandler] = useState(null);
  const themeRef = useRef(null);
  const walletHook = useAbstractWallet();
  const { wallet, balance, tickets, connectAGW, connectEOA, sessionKey, signer, isEOA, updateBalance, dropBall } = walletHook;

  useEffect(() => {
    const audio = new Audio('/sounds/stardrop-theme.mp3');
    audio.loop = true;
    themeRef.current = audio;
    console.log('Theme audio initialized');
    return () => {
      if (themeRef.current) {
        themeRef.current.pause();
        themeRef.current.currentTime = 0;
        console.log('Theme audio cleaned up');
      }
    };
  }, []);

  useEffect(() => {
    if (wallet && !muteTheme) {
      startTheme();
    }
  }, [wallet]);

  const handleDropResult = (result) => {
    updateBalance(result.payout, result.tickets);
  };

  const toggleEffects = () => setMuteEffects((prev) => !prev);

  const toggleTheme = () => {
    setMuteTheme((prev) => {
      if (themeRef.current) {
        if (!prev) {
          themeRef.current.pause();
          console.log('Theme muted');
        } else {
          themeRef.current.play().catch((error) => console.error('Theme play failed:', error));
          console.log('Theme unmuted');
        }
      }
      return !prev;
    });
  };

  const startTheme = () => {
    if (themeRef.current && !muteTheme) {
      console.log('Starting theme playback');
      themeRef.current.play().catch((error) => console.error('Theme play failed:', error));
    }
  };

  const connectEOAWithTheme = async () => {
    await connectEOA();
    console.log('EOA connect completed, wallet:', wallet);
  };

  const connectAGWWithTheme = async () => {
    await connectAGW();
    console.log('AGW connect completed, wallet:', wallet);
  };

  const incrementWager = (amount) => setWager(prev => Math.min(prev + amount, balance));
  const decrementWager = (amount) => setWager(prev => Math.max(prev - amount, 0.001));

  const memoizedPlinkoBoard = useMemo(() => (
    <PlinkoBoard
      wager={wager}
      sessionKey={isEOA ? signer : sessionKey}
      onResult={handleDropResult}
      dropBall={dropBall}
      muteEffects={muteEffects}
      onDrop={setDropHandler} // Pass drop handler
    />
  ), [wager, sessionKey, signer, isEOA, dropBall, muteEffects]);

  return (
    <AppContainer>
      <CosmicOverlay />
      <TopSection>
        <Title>StarDrop</Title>
        {!wallet ? (
          <WalletButtons>
            <ConnectButton onClick={connectAGWWithTheme}>Sign In (AGW)</ConnectButton>
            <ConnectButton onClick={connectEOAWithTheme}>Connect MetaMask</ConnectButton>
          </WalletButtons>
        ) : (
          <WalletInfo>
            <p>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} ({isEOA ? 'EOA' : 'AGW'})</p>
          </WalletInfo>
        )}
      </TopSection>
      {wallet && memoizedPlinkoBoard}
      {wallet && (
        <BottomControls>
          <WagerSection>
            <FundsTracker>
              <p>Balance: {balance.toFixed(4)} ETH</p>
              <p>Tickets: {tickets}</p>
            </FundsTracker>
            <WagerControls>
              <WagerButton onClick={() => decrementWager(0.001)}>-</WagerButton>
              <WagerInput
                type="number"
                value={wager}
                onChange={(e) => setWager(parseFloat(e.target.value))}
                step="0.001"
                min="0.001"
                max={balance}
              />
              <WagerButton onClick={() => incrementWager(0.001)}>+</WagerButton>
            </WagerControls>
          </WagerSection>
          <DropButton onClick={dropHandler} disabled={!sessionKey || !dropHandler}>
            Drop
          </DropButton>
          <AudioControls>
            <ControlButton onClick={toggleEffects}>{muteEffects ? 'Unmute FX' : 'Mute FX'}</ControlButton>
            <ControlButton onClick={toggleTheme}>{muteTheme ? 'Unmute Theme' : 'Mute Theme'}</ControlButton>
          </AudioControls>
        </BottomControls>
      )}
    </AppContainer>
  );
};

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0015, #1e0533);
  font-family: 'Orbitron', sans-serif;
  color: #ffffff;
  position: relative;
  overflow: hidden;
`;

const CosmicOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('/starry-bg.jpg') no-repeat center/cover;
  opacity: 0.3;
  z-index: 0;
`;

const TopSection = styled.div`
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
`;

const Title = styled.h1`
  font-size: 48px;
  text-shadow: 0 0 15px rgba(50, 205, 50, 0.8); /* Lime green */
  letter-spacing: 2px;
  margin: 0;
`;

const WalletButtons = styled.div`
  position: absolute;
  right: 20px;
  display: flex;
  gap: 15px;
`;

const WalletInfo = styled.div`
  position: absolute;
  right: 20px;
  font-size: 16px;
  text-shadow: 0 0 5px rgba(50, 205, 50, 0.5); /* Lime green */
`;

const ConnectButton = styled.button`
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32; /* Lime green */
  border-radius: 5px;
  color: #0a0015;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5); /* Lime glow */
  &:hover {
    background: #32CD32; /* Lime fill */
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(50, 205, 50, 0.9);
  }
`;

const BottomControls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.9);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid #32CD32; /* Lime green */
  box-shadow: 0 -5px 20px rgba(50, 205, 50, 0.5); /* Lime green */
  z-index: 2;
`;

const WagerSection = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const FundsTracker = styled.div`
  text-align: center;
  p {
    margin: 5px 0;
    font-size: 18px;
    text-shadow: 0 0 5px rgba(50, 205, 50, 0.5); /* Lime green */
  }
`;

const WagerControls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WagerButton = styled.button`
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32; /* Lime green */
  border-radius: 5px;
  color: #0a0015;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5); /* Lime glow */
  &:hover {
    background: #32CD32; /* Lime fill */
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(50, 205, 50, 0.9);
  }
`;

const WagerInput = styled.input`
  padding: 10px;
  width: 120px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32; /* Lime green */
  border-radius: 5px;
  font-size: 16px;
  text-align: center;
  color: #0a0015;
  &:focus {
    outline: none;
    border-color: #ffffff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }
`;

const DropButton = styled.button`
  padding: 15px 40px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32; /* Lime green */
  border-radius: 8px;
  color: #0a0015;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Orbitron', sans-serif;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5); /* Lime glow */
  &:hover {
    background: #32CD32; /* Lime fill */
    transform: scale(1.1);
    box-shadow: 0 0 25px rgba(50, 205, 50, 0.9);
  }
  &:disabled {
    background: #666;
    border-color: #444;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const AudioControls = styled.div`
  display: flex;
  gap: 10px;
`;

const ControlButton = styled.button`
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32; /* Lime green */
  border-radius: 5px;
  color: #0a0015;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5); /* Lime glow */
  &:hover {
    background: #32CD32; /* Lime fill */
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(50, 205, 50, 0.9);
  }
`;

export default App;