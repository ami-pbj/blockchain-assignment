const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers");

describe("Marketplace", function () {
  let marketplace, owner, client, provider, admin;

  beforeEach(async function () {
    [owner, client, provider, admin] = await ethers.getSigners();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    // assigning roles
    await marketplace.setRole(client.address, 1); // Client
    await marketplace.setRole(provider.address, 2); // Provider
    await marketplace.setRole(admin.address, 3); // Admin
  });

  it("should follow the correct flow: create → apply → accept → fund → deliver → approve", async function () {
    // 1. Client posts service request
    await marketplace.connect(client).createService("Logo Design");

    // 2. Provider applies with proposal + price
    await marketplace
      .connect(provider)
      .applyForService(0, "I can design your logo", parseEther("1"));

    // 3. Client accepts provider
    await marketplace.connect(client).acceptApplication(0, 0);

    let service = await marketplace.getService(0);
    expect(service.state).to.equal(1); // Assigned
    expect(service.price).to.equal(parseEther("1"));

    // 4. Client deposits ETH
    await expect(
      marketplace.connect(client).fundService(0, { value: parseEther("1") })
    ).to.emit(marketplace, "ServiceFunded");

    service = await marketplace.getService(0);
    expect(service.state).to.equal(2); // Funded

    // 5. Provider delivers
    await expect(marketplace.connect(provider).deliverService(0)).to.emit(
      marketplace,
      "ServiceDelivered"
    );

    // 6. Client approves
    await expect(marketplace.connect(client).approveService(0)).to.emit(
      marketplace,
      "ServiceApproved"
    );

    service = await marketplace.getService(0);
    expect(service.state).to.equal(4); // Approved
  });
});
