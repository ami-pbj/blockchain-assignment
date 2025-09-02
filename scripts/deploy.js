const { ethers } = require("hardhat");

async function main() {
  const Marketplace = await ethers.getContractFactory("Marketplace");

  // deploying contract
  const marketplace = await Marketplace.deploy();

  // waiting for the deployment to be mined
  await marketplace.waitForDeployment();

  console.log("Marketplace deployed to:", await marketplace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
