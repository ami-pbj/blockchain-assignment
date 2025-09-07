import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ProviderDashboard({ contract, signer }) {
  const [services, setServices] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [proposalTexts, setProposalTexts] = useState({});
  const [proposalPrices, setProposalPrices] = useState({});
  const [myAssignedServices, setMyAssignedServices] = useState([]);

  useEffect(() => {
    if (contract && signer) {
      loadServices();
      loadMyApplications();
      loadMyAssignedServices();
    }
  }, [contract, signer]);

  const loadServices = async () => {
    try {
      // Get open services (state 0 - Created)
      const openServices = await contract.getOpenServices();
      setServices(openServices);
    } catch (err) {
      console.error("Error loading services:", err);
      toast.error("Failed to load services");
    }
  };

  const loadMyApplications = async () => {
    if (!signer) return;

    try {
      const applicationIds = await contract.getProviderApplications(
        signer.address
      );
      const applications = [];

      for (const serviceId of applicationIds) {
        try {
          const service = await contract.getService(serviceId);
          const applicationCount = await contract.getApplicationCount(
            serviceId
          );

          for (let i = 0; i < applicationCount; i++) {
            const application = await contract.getApplication(serviceId, i);
            if (application.provider === signer.address) {
              applications.push({
                serviceId: serviceId,
                proposal: application.proposal,
                price: application.price,
                accepted: application.accepted,
                service: service,
              });
            }
          }
        } catch (error) {
          console.error(
            `Error loading application for service ${serviceId}:`,
            error
          );
        }
      }

      setMyApplications(applications);
    } catch (err) {
      console.error("Error loading applications:", err);
    }
  };

  const loadMyAssignedServices = async () => {
    if (!signer) return;

    try {
      const serviceCount = await contract.nextServiceId();
      const assignedServices = [];

      for (let i = 0; i < serviceCount; i++) {
        const service = await contract.getService(i);
        if (service.provider === signer.address && service.state !== 0) {
          assignedServices.push(service);
        }
      }

      setMyAssignedServices(assignedServices);
    } catch (err) {
      console.error("Error loading assigned services:", err);
    }
  };

  const applyForService = async (serviceId, proposal, price) => {
    if (!proposal.trim()) {
      toast.error("Please enter a proposal");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      const tx = await contract.applyForService(
        serviceId,
        proposal,
        ethers.parseEther(price)
      );
      await tx.wait();
      toast.success("Application submitted!");

      // Clear the proposal text and price for this service
      setProposalTexts((prev) => ({ ...prev, [serviceId]: "" }));
      setProposalPrices((prev) => ({ ...prev, [serviceId]: "" }));

      // Reload data
      loadServices();
      loadMyApplications();
    } catch (err) {
      console.error("Error applying for service:", err);
      if (err.message.includes("Unauthorized role")) {
        toast.error("Only providers can apply for services");
      } else if (err.message.includes("Invalid state")) {
        toast.error("Service is not available for applications");
      } else {
        toast.error(err.message);
      }
    }
  };

  const deliverService = async (serviceId) => {
    try {
      const tx = await contract.deliverService(serviceId);
      await tx.wait();
      toast.success("Service delivered!");
      loadMyAssignedServices();
    } catch (err) {
      console.error("Error delivering service:", err);
      toast.error(err.message);
    }
  };

  const handleProposalChange = (serviceId, text) => {
    setProposalTexts((prev) => ({ ...prev, [serviceId]: text }));
  };

  const handlePriceChange = (serviceId, price) => {
    setProposalPrices((prev) => ({ ...prev, [serviceId]: price }));
  };

  const getStateName = (state) => {
    const states = [
      "Created", // 0
      "Assigned", // 1
      "Funded", // 2
      "Delivered", // 3
      "Approved", // 4
      "Disputed", // 5
      "Resolved", // 6
    ];
    return states[Number(state)] || "Unknown";
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">Provider Dashboard</h2>

      {/* Available Services Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Available Services (Created)</h3>
        {services.length === 0 ? (
          <p>No available services. Services need to be created by clients.</p>
        ) : (
          services.map((service) => (
            <div
              key={service.id.toString()}
              className="border border-gray-700 rounded p-2 mb-2"
            >
              <p>
                <strong>ID:</strong> {service.id.toString()} -{" "}
                {service.description}
              </p>
              <p>
                <strong>Client:</strong> {service.client}
              </p>

              {/* Application Form */}
              <div className="mt-2">
                <textarea
                  placeholder="Write your proposal here..."
                  value={proposalTexts[service.id] || ""}
                  onChange={(e) =>
                    handleProposalChange(service.id, e.target.value)
                  }
                  className="w-full p-2 mb-2 text-white bg-gray-700 rounded outline-none"
                  rows="3"
                />
                <input
                  type="number"
                  placeholder="Your proposed price in ETH"
                  value={proposalPrices[service.id] || ""}
                  onChange={(e) =>
                    handlePriceChange(service.id, e.target.value)
                  }
                  className="w-full p-2 mb-2 text-white bg-gray-700 rounded outline-none"
                  step="0.001"
                  min="0"
                />
                <button
                  onClick={() =>
                    applyForService(
                      service.id,
                      proposalTexts[service.id] || "",
                      proposalPrices[service.id] || ""
                    )
                  }
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                >
                  Apply for this Service
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* My Applications Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">My Applications</h3>
        {myApplications.length === 0 ? (
          <p>No applications submitted yet</p>
        ) : (
          myApplications.map((app, index) => (
            <div
              key={index}
              className="border border-gray-700 rounded p-2 mb-2"
            >
              <p>
                <strong>Service ID:</strong> {app.serviceId.toString()} -{" "}
                {app.service.description}
              </p>
              <p>
                <strong>Proposal:</strong> {app.proposal}
              </p>
              <p>
                <strong>Proposed Price:</strong> {ethers.formatEther(app.price)}{" "}
                ETH
              </p>
              <p>
                <strong>Status:</strong> {app.accepted ? "Accepted" : "Pending"}
              </p>
              <p>
                <strong>Service State:</strong>{" "}
                {getStateName(app.service.state)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* My Assigned Services Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">My Assigned Services</h3>
        {myAssignedServices.length === 0 ? (
          <p>No assigned services</p>
        ) : (
          myAssignedServices.map((service) => (
            <div
              key={service.id.toString()}
              className="border border-gray-700 rounded p-2 mb-2"
            >
              <p>
                <strong>ID:</strong> {service.id.toString()} -{" "}
                {service.description}
              </p>
              <p>
                <strong>Price:</strong> {ethers.formatEther(service.price)} ETH
              </p>
              <p>
                <strong>State:</strong> {getStateName(service.state)}
              </p>
              <p>
                <strong>Client:</strong> {service.client}
              </p>

              {service.state === 2 && (
                <button
                  onClick={() => deliverService(service.id)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mt-2"
                >
                  Mark as Delivered
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
