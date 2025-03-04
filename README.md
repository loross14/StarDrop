Contract on Abscan: https://sepolia.abscan.org/address/0x72b5946D36cfB812DA21376F782D88AB3F03F107

Implementation:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract StarDrop {
    mapping(address => uint256) public ticketBalances;
    uint256[] public multipliers = [0, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50];
    uint256 public totalNFTs = 10;
    mapping(uint256 => bool) public nftMinted;

    event BallDropped(address player, uint256 wager, uint256 multiplier, uint256 payout);
    event TicketsSettled(address player, uint256 amount);
    event NFTMinted(address player, uint256 toyId);

    function dropBall(uint256 wager) external returns (uint256 multiplier, uint256 payout) {
        require(wager >= 0.001 ether, "Minimum wager is 0.001 ETH");
        uint256 slot = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 11;
        multiplier = multipliers[slot] / 10;
        payout = wager * multiplier;
        ticketBalances[msg.sender] += wager / 0.001 ether + payout / 0.001 ether;
        emit BallDropped(msg.sender, wager, multiplier, payout);
        return (multiplier, payout);
    }

    function settleTickets(uint256 amount) external {
        require(ticketBalances[msg.sender] >= amount, "Insufficient tickets");
        ticketBalances[msg.sender] -= amount;
        emit TicketsSettled(msg.sender, amount);
    }

    function mintNFT(uint256 toyId) external {
        require(toyId >= 1 && toyId <= totalNFTs, "Invalid toy ID");
        require(!nftMinted[toyId], "NFT already minted");
        uint256 cost = toyId <= 5 ? 500 : 1500;
        require(ticketBalances[msg.sender] >= cost, "Insufficient tickets");
        ticketBalances[msg.sender] -= cost;
        nftMinted[toyId] = true;
        emit NFTMinted(msg.sender, toyId);
    }

    function balanceOf(address account) external view returns (uint256) {
        return account.balance;
    }

    function ticketBalanceOf(address account) external view returns (uint256) {
        return ticketBalances[account];
    }

    receive() external payable {}
}
