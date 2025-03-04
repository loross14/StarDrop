import { useState } from 'react';
import { ethers } from 'ethers';

const GAME_CONTRACT_ADDRESS = '0x72b5946D36cfB812DA21376F782D88AB3F03F107';
const GAME_CONTRACT_ABI = [
  'function dropBall(uint256 wager) external returns (uint256 multiplier, uint256 payout)',
  'function settleTickets(uint256 amount) external',
  'function mintNFT(uint256 toyId) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function ticketBalanceOf(address account) external view returns (uint256)',
];

export function useEOAWallet() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const connectEOA = async () => {
    try {
      console.log('Connecting EOA wallet (MetaMask)...');
      if (!window.ethereum) throw new Error('MetaMask not installed');
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const signer = await browserProvider.getSigner();
      const address = accounts[0];
      setProvider(browserProvider);
      setSigner(signer);
      setWallet({ address });
      console.log('EOA connected:', address);

      const ethBalance = await browserProvider.getBalance(address);
      setBalance(parseFloat(ethers.formatEther(ethBalance)));
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
      const ticketBalance = await contract.ticketBalanceOf(address);
      setTickets(Number(ticketBalance));
      console.log('EOA Balance:', ethers.formatEther(ethBalance), 'Tickets:', ticketBalance);
    } catch (error) {
      console.error('EOA connect failed:', error);
    }
  };

  const updateBalance = async (payout, ticketsEarned) => {
    setBalance((prev) => Math.max(0, prev + Number(payout)));
    setTickets((prev) => prev + ticketsEarned);

    const ethBalance = await provider.getBalance(wallet.address);
    setBalance(parseFloat(ethers.formatEther(ethBalance)));
    const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
    const ticketBalance = await contract.ticketBalanceOf(wallet.address);
    setTickets(Number(ticketBalance));
    console.log('EOA Balance updated:', ethers.formatEther(ethBalance));
  };

  const dropBall = async (wager) => {
    if (!signer) {
      console.error('Drop failed: No EOA signer');
      return null;
    }
    try {
      console.log('EOA Dropping ball with wager:', wager);
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
      const tx = await contract.dropBall(ethers.parseEther(wager.toString()), {
        value: ethers.parseEther(wager.toString()),
      });
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.topics[0] === ethers.id('BallDropped(address,uint256,uint256,uint256)'));
      const [_, , multiplier, payout] = ethers.AbiCoder.defaultAbiCoder().decode(['address', 'uint256', 'uint256', 'uint256'], event.data);
      const tickets = Math.floor(Number(ethers.formatEther(payout)));
      console.log('EOA Drop result:', { multiplier: Number(multiplier), payout: ethers.formatEther(payout), tickets });
      return { multiplier: Number(multiplier), payout: ethers.formatEther(payout), tickets };
    } catch (error) {
      console.error('EOA Drop failed:', error);
      return null;
    }
  };

  const settleTickets = async (amount) => {
    if (!signer) return;
    try {
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
      const tx = await contract.settleTickets(amount);
      await tx.wait();
      console.log('EOA Tickets settled:', amount);
    } catch (error) {
      console.error('EOA Ticket settle failed:', error);
    }
  };

  const mintNFT = async (toyId, ticketCost) => {
    if (!signer || tickets < ticketCost) return false;
    try {
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
      const tx = await contract.mintNFT(toyId);
      await tx.wait();
      setTickets((prev) => prev - ticketCost);
      console.log('EOA NFT minted:', toyId);
      return true;
    } catch (error) {
      console.error('EOA NFT mint failed:', error);
      return false;
    }
  };

  return {
    wallet,
    balance,
    tickets,
    signer,
    connectEOA,
    dropBall,
    settleTickets,
    mintNFT,
    updateBalance,
  };
}