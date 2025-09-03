const { ethers } = require("hardhat");

async function main() {
  // Get multiple accounts for testing different roles
  const [deployer, client, provider] = await ethers.getSigners();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();

  console.log("Marketplace deployed to:", await marketplace.getAddress());

  // assigning roles - deployer is already owner
  await marketplace.setRole(client.address, 1);
  await marketplace.setRole(provider.address, 2);
  await marketplace.setRole(deployer.address, 3);

  console.log("Roles assigned successfully!");
  console.log("Client:", client.address);
  console.log("Provider:", provider.address);
  console.log("Admin:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
