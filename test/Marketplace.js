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

    // 5. Provider delivers with description
    await expect(
      marketplace
        .connect(provider)
        .deliverService(
          0,
          "Here is the completed logo design: https://example.com/logo.png"
        )
    ).to.emit(marketplace, "ServiceDelivered");

    service = await marketplace.getService(0);
    expect(service.state).to.equal(3); // Delivered
    expect(service.deliveryDescription).to.equal(
      "Here is the completed logo design: https://example.com/logo.png"
    );

    // 6. Client approves
    await expect(marketplace.connect(client).approveService(0)).to.emit(
      marketplace,
      "ServiceApproved"
    );

    service = await marketplace.getService(0);
    expect(service.state).to.equal(4); // Approved
  });

  it("should handle dispute flow correctly", async function () {
    // 1. Client posts service request
    await marketplace.connect(client).createService("Website Development");

    // 2. Provider applies with proposal + price
    await marketplace
      .connect(provider)
      .applyForService(0, "I can develop your website", parseEther("5"));

    // 3. Client accepts provider
    await marketplace.connect(client).acceptApplication(0, 0);

    // 4. Client deposits ETH
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("5") });

    // 5. Provider delivers with description
    await marketplace
      .connect(provider)
      .deliverService(0, "Website completed: https://example.com");

    // 6. Client disputes the service
    await expect(marketplace.connect(client).disputeService(0)).to.emit(
      marketplace,
      "ServiceDisputed"
    );

    let service = await marketplace.getService(0);
    expect(service.state).to.equal(5); // Disputed

    // 7. Admin resolves the dispute (approve)
    await expect(marketplace.connect(admin).resolveDispute(0, true)).to.emit(
      marketplace,
      "ServiceResolved"
    );

    service = await marketplace.getService(0);
    expect(service.state).to.equal(4); // Approved after dispute resolution

    // Check disputed services list is empty after resolution
    const disputedServices = await marketplace.getDisputedServices();
    expect(disputedServices.length).to.equal(0);
  });

  it("should return disputed services for admin", async function () {
    // Create and dispute a service
    await marketplace.connect(client).createService("App Development");
    await marketplace
      .connect(provider)
      .applyForService(0, "I can develop your app", parseEther("10"));
    await marketplace.connect(client).acceptApplication(0, 0);
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("10") });
    await marketplace
      .connect(provider)
      .deliverService(0, "App delivered: https://example.com/app");
    await marketplace.connect(client).disputeService(0);

    // Check that admin can see disputed services
    const disputedServices = await marketplace.getDisputedServices();
    expect(disputedServices.length).to.equal(1);
    expect(disputedServices[0].id).to.equal(0);
    expect(disputedServices[0].description).to.equal("App Development");
    expect(disputedServices[0].state).to.equal(5); // Disputed
  });

  it("should reject empty delivery description", async function () {
    await marketplace.connect(client).createService("Logo Design");
    await marketplace
      .connect(provider)
      .applyForService(0, "I can design your logo", parseEther("1"));
    await marketplace.connect(client).acceptApplication(0, 0);
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("1") });

    // Trying to deliver with empty description - should fail
    await expect(
      marketplace.connect(provider).deliverService(0, "")
    ).to.be.revertedWith("Delivery description required");
  });

  it("should only allow provider to deliver service", async function () {
    await marketplace.connect(client).createService("Logo Design");
    await marketplace
      .connect(provider)
      .applyForService(0, "I can design your logo", parseEther("1"));
    await marketplace.connect(client).acceptApplication(0, 0);
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("1") });

    // Try to deliver with non-provider - should fail
    await expect(
      marketplace.connect(client).deliverService(0, "Completed work")
    ).to.be.revertedWith("Unauthorized role");
  });

  it("should prevent provider from re-delivering disputed service", async function () {
    // Create service and go through normal flow
    await marketplace.connect(client).createService("Website Development");
    await marketplace
      .connect(provider)
      .applyForService(0, "I can develop your website", parseEther("5"));
    await marketplace.connect(client).acceptApplication(0, 0);
    await marketplace
      .connect(client)
      .fundService(0, { value: parseEther("5") });

    // Provider delivers
    await marketplace
      .connect(provider)
      .deliverService(0, "Website completed: https://example.com");

    // Client disputes
    await marketplace.connect(client).disputeService(0);

    // Try to re-deliver - should fail with "Invalid state for this action"
    await expect(
      marketplace
        .connect(provider)
        .deliverService(0, "Updated website: https://example.com/v2")
    ).to.be.revertedWith("Invalid state for this action"); // UPDATED EXPECTED ERROR
  });
});
