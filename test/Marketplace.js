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

    // assigning the roles like client, provider and admin
    await marketplace.setRole(client.address, 1);
    await marketplace.setRole(provider.address, 2);
    await marketplace.setRole(admin.address, 3);
  });

  it("should follow the correct flow: create → apply → accept → fund → deliver → approve", async function () {
    // 1. Client posts service request
    await marketplace
      .connect(client)
      .createService("Logo Design", parseEther("1"));

    // 2. Provider applies
    await marketplace
      .connect(provider)
      .applyForService(0, "I can design your logo");

    // 3. Client selects provider
    await marketplace.connect(client).acceptApplication(0, 0);

    // Check state is Assigned (not Funded yet)
    let service = await marketplace.getService(0);
    expect(service.state).to.equal(2); // Assigned state

    // 4. Client deposits ETH
    await expect(
      marketplace.connect(client).fundService(0, { value: parseEther("1") })
    ).to.emit(marketplace, "ServiceFunded");

    // Check state is Funded
    service = await marketplace.getService(0);
    expect(service.state).to.equal(1); // Funded state

    // 5. Provider delivers work
    await expect(marketplace.connect(provider).deliverService(0)).to.emit(
      marketplace,
      "ServiceDelivered"
    );

    // 6. Client approves
    await expect(marketplace.connect(client).approveService(0)).to.emit(
      marketplace,
      "ServiceApproved"
    );

    // Check final state is Approved and funds transferred
    service = await marketplace.getService(0);
    expect(service.state).to.equal(4);
  });
});
