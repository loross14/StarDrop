import React, { useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import PlinkoBoard from './components/PlinkoBoard';
import { useAGWWallet } from './hooks/useAGWWallet';
import { useEOAWallet } from './hooks/useEOAWallet';

function App() {
  const [wager, setWager] = useState(0.001);
  const [muteEffects, setMuteEffects] = useState(false);
  const [muteTheme, setMuteTheme] = useState(true);
  const [dropHandler, setDropHandler] = useState(() => () => {});
  const [walletType, setWalletType] = useState(null);
  const themeRef = useRef(null);

  const agwHook = useAGWWallet();
  const eoaHook = useEOAWallet();
  const walletHook = walletType === 'AGW' ? agwHook : walletType === 'EOA' ? eoaHook : null;

  const { wallet, balance, tickets, dropBall, updateBalance } = walletHook || {};
  const sessionKey = walletType === 'AGW' ? agwHook.sessionKey : null;
  const signer = walletType === 'EOA' ? eoaHook.signer : null;

  const handleDropResult = (result) => {
    updateBalance(result.payout, result.tickets);
  };

  const toggleEffects = () => setMuteEffects((prev) => !prev);

  const toggleTheme = () => {
    setMuteTheme((prev) => {
      if (prev) {
        if (!themeRef.current) {
          themeRef.current = new Audio('/sounds/stardrop-theme.mp3');
          themeRef.current.loop = true;
        }
        themeRef.current.play().catch((error) => console.error('Theme play failed:', error));
        console.log('Theme unmuted');
      } else {
        if (themeRef.current) {
          themeRef.current.pause();
          themeRef.current.currentTime = 0;
          console.log('Theme muted');
        }
      }
      return !prev;
    });
  };

  const connectEOAWithTheme = async () => {
    await eoaHook.connectEOA();
    console.log('EOA connect completed, wallet:', eoaHook.wallet);
    setWalletType('EOA');
  };

  const connectAGWWithTheme = async () => {
    await agwHook.connectAGW();
    console.log('AGW connect completed, wallet:', agwHook.wallet);
    setWalletType('AGW');
  };

  const incrementWager = (amount) => setWager(prev => Math.min(prev + amount, balance));
  const decrementWager = (amount) => setWager(prev => Math.max(prev - amount, 0.001));

  const memoizedPlinkoBoard = useMemo(() => (
    <PlinkoBoard
      wager={wager}
      sessionKey={sessionKey}
      signer={signer}
      onResult={handleDropResult}
      dropBall={dropBall}
      muteEffects={muteEffects}
      onDrop={setDropHandler}
    />
  ), [wager, sessionKey, signer, dropBall, muteEffects, dropHandler]);

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
            <p>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} ({walletType})</p>
          </WalletInfo>
        )}
      </TopSection>
      {wallet && (sessionKey || signer) && memoizedPlinkoBoard}
      {wallet && (sessionKey || signer) && (
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
          {console.log('DropButton render, dropHandler:', dropHandler)}
          <DropButton onClick={() => dropHandler()} disabled={!wallet || !dropBall}>
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

// Styled components unchanged from your last version
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
  text-shadow: 0 0 15px rgba(50, 205, 50, 0.8);
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
  text-shadow: 0 0 5px rgba(50, 205, 50, 0.5);
`;

const ConnectButton = styled.button`
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32;
  border-radius: 5px;
  color: #0a0015;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5);
  &:hover {
    background: #32CD32;
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
  border-top: 2px solid #32CD32;
  box-shadow: 0 -5px 20px rgba(50, 205, 50, 0.5);
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
    text-shadow: 0 0 5px rgba(50, 205, 50, 0.5);
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
  border: 2px solid #32CD32;
  border-radius: 5px;
  color: #0a0015;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5);
  &:hover {
    background: #32CD32;
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(50, 205, 50, 0.9);
  }
`;

const WagerInput = styled.input`
  padding: 10px;
  width: 120px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #32CD32;
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
  border: 2px solid #32CD32;
  border-radius: 8px;
  color: #0a0015;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Orbitron', sans-serif;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5);
  &:hover {
    background: #32CD32;
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
  border: 2px solid #32CD32;
  border-radius: 5px;
  color: #0a0015;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.5);
  &:hover {
    background: #32CD32;
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(50, 205, 50, 0.9);
  }
`;

export default App;