const { ethers } = require("hardhat");

async function main() {
  // assigning account roles - client, provider, admin
  const [deployer, client, provider] = await ethers.getSigners();
  
  const Marketplace = await ethers.getContractFactory("Marketplace");

  // deploying contract
  const marketplace = await Marketplace.deploy();

  // waiting for the deployment to be mined
  await marketplace.waitForDeployment();

  console.log("Marketplace deployed to:", await marketplace.getAddress());

  await marketplace.setRole(deployer.address, 3);
  await marketplace.setRole(client.address, 1);
  await marketplace.setRole(provider.address, 2);

  console.log("Roles assigned successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
