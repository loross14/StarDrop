import { useState, useEffect } from 'react';
import { createAbstractClient } from '@abstract-foundation/agw-client';
import { abstractTestnet } from 'viem/chains';
import { http } from 'viem';
import { Provider, Wallet } from 'zksync-ethers';
import { ethers } from 'ethers';

const ALCHEMY_URL = 'https://abstract-testnet.g.alchemy.com/v2/j1wKSeuionFAHVq1eZ0MuqsCYE7T24eV';
const GAME_CONTRACT_ADDRESS = '0x72b5946D36cfB812DA21376F782D88AB3F03F107';

const GAME_CONTRACT_ABI = [
  'function dropBall(uint256 wager) external returns (uint256 multiplier, uint256 payout)',
  'function settleTickets(uint256 amount) external',
  'function mintNFT(uint256 toyId) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function ticketBalanceOf(address account) external view returns (uint256)',
];

export function useAbstractWallet() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [sessionKey, setSessionKey] = useState(null); // AGW only
  const [client, setClient] = useState(null); // AGW only
  const [provider, setProvider] = useState(null); // EOA/MetaMask
  const [signer, setSigner] = useState(null); // EOA/MetaMask
  const [isEOA, setIsEOA] = useState(false); // Track wallet type

  // AGW Connect (Smart Contract Wallet)
  const connectAGW = async () => {
    try {
      console.log('Connecting AGW wallet...');
      const provider = new Provider('https://api.testnet.abs.xyz');
      const zkWallet = new Wallet('74428afd2a88ff49314a200efddec64bc36651410835d56c4017cae8db4b1045', provider);
      const signer = { address: zkWallet.address };
      const agwClient = await createAbstractClient({
        signer,
        chain: abstractTestnet,
        transport: http(ALCHEMY_URL),
      });
      setClient(agwClient);
      setWallet({ address: agwClient.account.address });

      const sessionConfig = {
        actions: [
          { contract: GAME_CONTRACT_ADDRESS, function: 'dropBall' },
          { contract: GAME_CONTRACT_ADDRESS, function: 'settleTickets' },
          { contract: GAME_CONTRACT_ADDRESS, function: 'mintNFT' },
        ],
        expires: Math.floor(Date.now() / 1000) + 3600,
      };
      const sessionKeyAccount = await agwClient.createSession(sessionConfig);
      setSessionKey(sessionKeyAccount);
      setIsEOA(false);
      console.log('AGW Session key set:', sessionKeyAccount);

      const ethBalance = await agwClient.getBalance({ address: agwClient.account.address });
      setBalance(parseFloat(ethers.formatEther(ethBalance)));
      const ticketBalance = await agwClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'ticketBalanceOf',
        args: [agwClient.account.address],
      });
      setTickets(Number(ticketBalance));
      console.log('AGW connected:', agwClient.account.address, 'Balance:', ethers.formatEther(ethBalance));
    } catch (error) {
      console.error('AGW connect failed:', error);
    }
  };

  // EOA Connect (MetaMask)
  const connectEOA = async () => {
    try {
      console.log('Connecting EOA wallet (MetaMask)...');
      if (!window.ethereum) throw new Error('MetaMask not installed');
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const signer = await browserProvider.getSigner();
      const address = accounts[0]; // Use first account
      setProvider(browserProvider);
      setSigner(signer);
      setWallet({ address });
      setIsEOA(true);
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

    if (isEOA) {
      const ethBalance = await provider.getBalance(wallet.address);
      setBalance(parseFloat(ethers.formatEther(ethBalance)));
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
      const ticketBalance = await contract.ticketBalanceOf(wallet.address);
      setTickets(Number(ticketBalance));
      console.log('EOA Balance updated:', ethers.formatEther(ethBalance));
    } else {
      const ethBalance = await client.getBalance({ address: wallet.address });
      setBalance(parseFloat(ethers.formatEther(ethBalance)));
      const ticketBalance = await client.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'ticketBalanceOf',
        args: [wallet.address],
      });
      setTickets(Number(ticketBalance));
      console.log('AGW Balance updated:', ethers.formatEther(ethBalance));
    }
  };

  const dropBall = async (wager) => {
    if (isEOA) {
      if (!signer) {
        console.error('Drop failed: No EOA signer');
        return null;
      }
      try {
        console.log('EOA Dropping ball with wager:', wager);
        const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
        const tx = await contract.dropBall(ethers.parseEther(wager.toString()));
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.topics[0] === ethers.id('BallDropped(address,uint256,uint256,uint256)'));
        const [_, , multiplier, payout] = ethers.AbiCoder.defaultAbiCoder().decode(['address', 'uint256', 'uint256', 'uint256'], event.data);
        const tickets = Math.floor(Number(ethers.formatEther(payout))); // Fix: Base on payout only
        console.log('EOA Drop result:', { multiplier: Number(multiplier), payout: ethers.formatEther(payout), tickets });
        return { multiplier: Number(multiplier), payout: ethers.formatEther(payout), tickets };
      } catch (error) {
        console.error('EOA Drop failed:', error);
        return null;
      }
    } else {
      if (!client || !sessionKey) {
        console.error('Drop failed: Missing AGW client or sessionKey', { client, sessionKey });
        return null;
      }
      try {
        console.log('AGW Dropping ball with wager:', wager);
        const txHash = await client.writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'dropBall',
          args: [ethers.parseEther(wager.toString())],
          account: sessionKey,
        });
        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        const event = receipt.logs.find(log => log.topics[0] === ethers.id('BallDropped(address,uint256,uint256,uint256)'));
        const [_, , multiplier, payout] = ethers.AbiCoder.defaultAbiCoder().decode(['address', 'uint256', 'uint256', 'uint256'], event.data);
        const tickets = Math.floor(Number(ethers.formatEther(payout))); // Fix: Base on payout only
        console.log('AGW Drop result:', { multiplier: Number(multiplier), payout: ethers.formatEther(payout), tickets });
        return { multiplier: Number(multiplier), payout: ethers.formatEther(payout), tickets };
      } catch (error) {
        console.error('AGW Drop failed:', error);
        return null;
      }
    }
  };

  const settleTickets = async (amount) => {
    if (isEOA) {
      if (!signer) return;
      try {
        const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, signer);
        const tx = await contract.settleTickets(amount);
        await tx.wait();
        console.log('EOA Tickets settled:', amount);
      } catch (error) {
        console.error('EOA Ticket settle failed:', error);
      }
    } else {
      if (!client || !sessionKey) return;
      try {
        const txHash = await client.writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'settleTickets',
          args: [amount],
          account: sessionKey,
        });
        await client.waitForTransactionReceipt({ hash: txHash });
        console.log('AGW Tickets settled:', amount);
      } catch (error) {
        console.error('AGW Ticket settle failed:', error);
      }
    }
  };

  const mintNFT = async (toyId, ticketCost) => {
    if (isEOA) {
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
    } else {
      if (!client || !sessionKey || tickets < ticketCost) return false;
      try {
        const txHash = await client.writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'mintNFT',
          args: [toyId],
          account: sessionKey,
        });
        await client.waitForTransactionReceipt({ hash: txHash });
        setTickets((prev) => prev - ticketCost);
        console.log('AGW NFT minted:', toyId);
        return true;
      } catch (error) {
        console.error('AGW NFT mint failed:', error);
        return false;
      }
    }
  };

  return {
    wallet,
    balance,
    tickets,
    connectAGW,
    connectEOA,
    sessionKey, // AGW only
    signer,     // EOA only
    isEOA,
    updateBalance,
    dropBall,
    settleTickets,
    mintNFT,
  };
}