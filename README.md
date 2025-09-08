# Decentralized Marketplace (dApp)

This project is a full-stack decentralized application (dApp) built with Ethereum smart contracts (Solidity, Hardhat) and a React frontend (ethers.js). It demonstrates a real-world workflow where clients post services, providers apply, and payments are securely handled through smart contracts.

## Features

- Role-based access: Client, Provider, Admin
- Service lifecycle: Create → Apply → Assign → Fund → Deliver → Approve/Dispute
- Escrow-style payments via smart contract
- Frontend wallet connection with MetaMask
- Admin can resolve disputes

## Prerequisites

- Node.js & npm
- MetaMask wallet
- Hardhat (installed via npm)

## Installation

Clone the repo and install dependencies:

```shell
git clone <your-repo-url>
cd <project-folder>
npm install
```

## Development Workflow

### Step 1: Compile & Test Contracts

In the first terminal:

```shell
npx hardhat clean       # If previously compiled
npx hardhat compile
npx hardhat test        # Run smart contract tests
npx hardhat node        # Start a local Hardhat blockchain
```

This will start a local Hardhat blockchain.

### Step 2: Deploy Contract

In a second terminal:

```shell
npx hardhat run scripts/deploy.js --network localhost
node scripts/copy-abi.js    # Copies MarketplaceABI from artifacts to frontend
```

This deploys the Marketplace smart contract to the local Hardhat blockchain and automatically save the deployed contract address into the frontend.

### Step 3: Start Frontend

In a third terminal:

```shell
npm start
```

The React frontend will be available at http://localhost:3000.

## Usage

Open the frontend in your browser.
- Click Connect Wallet (ensure MetaMask is connected to the local Hardhat network).
- The connected account will be assigned a role (Client / Provider / Admin).
- Depending on the role:
    - Client: Create services, accept provider applications, fund, approve, or dispute.
    - Provider: Apply for services, deliver after funded.
    - Admin: Resolve disputes.

## Notes

- By default, the first Hardhat account (deployer) is the contract owner (Admin).
- Make sure your MetaMask network is set to localhost 8545.
- Each action (funding, delivery, approval) changes the service state on-chain.

## MetaMask Local Network Setup  

- **Network Name:** Localhost 8545  
- **RPC URL:** http://127.0.0.1:8545  
- **Chain ID:** 31337 (Hardhat default)  
- **Currency Symbol:** ETH  