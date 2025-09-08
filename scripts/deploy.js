const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get multiple accounts for testing different roles
  const [deployer, client, provider] = await ethers.getSigners();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();

  const deployedAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", deployedAddress);

  // assigning roles - deployer is already owner
  await marketplace.setRole(client.address, 1);
  await marketplace.setRole(provider.address, 2);
  await marketplace.setRole(deployer.address, 3);

  console.log("Roles assigned successfully!");
  console.log("Client:", client.address);
  console.log("Provider:", provider.address);
  console.log("Admin:", deployer.address);

  // Save deployed contract address to frontend
  const addressPath = path.join(
    __dirname,
    "../frontend/src/contracts/MarketplaceAddress.json"
  );

  fs.writeFileSync(
    addressPath,
    JSON.stringify({ address: deployedAddress }, null, 2)
  );
  console.log("Contract address saved to frontend!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
