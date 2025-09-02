const { ethers } = require("hardhat");

async function main() {
  const Marketplace = await ethers.getContractFactory("Marketplace");

  // deploying contract
  const marketplace = await Marketplace.deploy();

  // waiting for the deployment to be mined
  await marketplace.waitForDeployment();

  console.log("Marketplace deployed to:", await marketplace.getAddress());

  // assigning account roles - client, provider, admin
  const [admin, client, provider] = await ethers.getSigners();

  await marketplace.setRole(client.address, 1); 
  await marketplace.setRole(provider.address, 2);
  await marketplace.setRole(admin.address, 3);

  console.log("Roles assigned successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
