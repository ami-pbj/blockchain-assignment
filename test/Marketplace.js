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

  it("should let a client create and fund a service", async function () {
    await marketplace
      .connect(client)
      .createService("Logo Design", parseEther("1"));
    const service = await marketplace.getService(0);

    expect(service.client).to.equal(client.address);
    expect(service.price).to.equal(parseEther("1"));

    await expect(
      marketplace.connect(client).fundService(0, { value: parseEther("1") })
    ).to.emit(marketplace, "ServiceFunded");
  });

  it("should let client assign provider and provider deliver", async function () {
    await marketplace
      .connect(client)
      .createService("Logo Design", parseEther("1"));
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("1") });
    await marketplace.connect(client).assignProvider(0, provider.address);

    await expect(marketplace.connect(provider).deliverService(0)).to.emit(
      marketplace,
      "ServiceDelivered"
    );
  });

  it("should allow approval and transfer funds", async function () {
    await marketplace
      .connect(client)
      .createService("Logo Design", parseEther("1"));
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("1") });
    await marketplace.connect(client).assignProvider(0, provider.address);
    await marketplace.connect(provider).deliverService(0);

    await expect(marketplace.connect(client).approveService(0)).to.emit(
      marketplace,
      "ServiceApproved"
    );
  });
});
