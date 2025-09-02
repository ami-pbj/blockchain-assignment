const { ethers } = require("hardhat");

async function main() {
  // Get multiple accounts for testing different roles
  const [client1, client2, provider1, provider2, admin] =
    await ethers.getSigners();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();

  console.log("Marketplace deployed to:", await marketplace.getAddress());

  // assigning roles - deployer is already owner, so admin role is optional
  await marketplace.setRole(client1.address, 1); // Client 1
  // await marketplace.setRole(client2.address, 1); // Client 2
  await marketplace.setRole(provider1.address, 2); // Provider 1
  // await marketplace.setRole(provider2.address, 2); // Provider 2
  await marketplace.setRole(admin.address, 3); // Admin (could be deployer or separate account)

  console.log("Roles assigned successfully!");
  console.log("Client 1:", client1.address);
  // console.log("Client 2:", client2.address);
  console.log("Provider 1:", provider1.address);
  // console.log("Provider 2:", provider2.address);
  console.log("Admin:", admin.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
