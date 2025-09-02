import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ProviderDashboard({ contract, signer }) {
  const [services, setServices] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [proposalTexts, setProposalTexts] = useState({});
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    if (contract && signer) {
      loadServices();
      loadMyApplications();
    }
  }, [contract, signer]);

  const loadServices = async () => {
    setLoading(true);
    setDebugInfo("Loading services...");
    try {
      const serviceCount = await contract.nextServiceId();
      setDebugInfo((prev) => prev + `\nFound ${serviceCount} total services`);

      const servicesArray = [];
      let fundedCount = 0;

      for (let i = 0; i < serviceCount; i++) {
        try {
          const service = await contract.getService(i);
          setDebugInfo(
            (prev) => prev + `\nService ${i}: state ${service.state}`
          );

          // Show services that are funded (state 1)
          if (service.state === 1) {
            fundedCount++;
            servicesArray.push(service);
          }
        } catch (error) {
          setDebugInfo(
            (prev) => prev + `\nError loading service ${i}: ${error.message}`
          );
        }
      }

      setDebugInfo((prev) => prev + `\nFound ${fundedCount} funded services`);
      setServices(servicesArray);
    } catch (err) {
      console.error("Error loading services:", err);
      setDebugInfo((prev) => prev + `\nError: ${err.message}`);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    if (!signer) return;

    try {
      setDebugInfo(
        (prev) => prev + `\nLoading applications for ${signer.address}`
      );

      // Try to load applications using the function if it exists
      let applicationIds = [];
      try {
        if (typeof contract.getProviderApplications === "function") {
          applicationIds = await contract.getProviderApplications(
            signer.address
          );
          setDebugInfo(
            (prev) =>
              prev +
              `\nFound ${applicationIds.length} application IDs via function`
          );
        } else {
          setDebugInfo(
            (prev) => prev + `\ngetProviderApplications function not available`
          );
          // Fallback: manually search through all services for applications
          await manualApplicationSearch();
          return;
        }
      } catch (error) {
        setDebugInfo(
          (prev) =>
            prev + `\nError calling getProviderApplications: ${error.message}`
        );
        // Fallback if function call fails
        await manualApplicationSearch();
        return;
      }

      const applications = [];

      for (const serviceId of applicationIds) {
        try {
          const service = await contract.getService(serviceId);
          const applicationCount = await contract.getApplicationCount(
            serviceId
          );
          setDebugInfo(
            (prev) =>
              prev +
              `\nService ${serviceId} has ${applicationCount} applications`
          );

          for (let i = 0; i < applicationCount; i++) {
            const application = await contract.getApplication(serviceId, i);
            if (application.provider === signer.address) {
              applications.push({
                serviceId: serviceId,
                proposal: application.proposal,
                accepted: application.accepted,
                service: service,
              });
            }
          }
        } catch (error) {
          setDebugInfo(
            (prev) =>
              prev +
              `\nError loading application for service ${serviceId}: ${error.message}`
          );
        }
      }

      setMyApplications(applications);
      setDebugInfo(
        (prev) => prev + `\nFound ${applications.length} applications`
      );
    } catch (err) {
      console.error("Error loading applications:", err);
      setDebugInfo(
        (prev) => prev + `\nError loading applications: ${err.message}`
      );
    }
  };

  // Manual search for applications as fallback
  const manualApplicationSearch = async () => {
    setDebugInfo((prev) => prev + `\nStarting manual application search`);

    const applications = [];
    try {
      const serviceCount = await contract.nextServiceId();

      for (let serviceId = 0; serviceId < serviceCount; serviceId++) {
        try {
          const applicationCount = await contract.getApplicationCount(
            serviceId
          );

          for (let i = 0; i < applicationCount; i++) {
            try {
              const application = await contract.getApplication(serviceId, i);
              if (application.provider === signer.address) {
                const service = await contract.getService(serviceId);
                applications.push({
                  serviceId: serviceId,
                  proposal: application.proposal,
                  accepted: application.accepted,
                  service: service,
                });
              }
            } catch (error) {
              setDebugInfo(
                (prev) =>
                  prev +
                  `\nError loading application ${i} for service ${serviceId}: ${error.message}`
              );
            }
          }
        } catch (error) {
          // Service might not have applications or other error
        }
      }

      setMyApplications(applications);
      setDebugInfo(
        (prev) => prev + `\nManually found ${applications.length} applications`
      );
    } catch (error) {
      setDebugInfo(
        (prev) =>
          prev + `\nError in manual application search: ${error.message}`
      );
    }
  };

  const applyForService = async (serviceId, proposal) => {
    if (!proposal.trim()) {
      toast.error("Please enter a proposal");
      return;
    }

    try {
      setDebugInfo((prev) => prev + `\nApplying for service ${serviceId}`);
      const tx = await contract.applyForService(serviceId, proposal);
      await tx.wait();
      toast.success("Application submitted!");

      // Clear the proposal text for this service
      setProposalTexts((prev) => ({ ...prev, [serviceId]: "" }));

      // Reload data
      loadServices();
      loadMyApplications();
    } catch (err) {
      console.error("Error applying for service:", err);
      setDebugInfo((prev) => prev + `\nApplication error: ${err.message}`);
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
      loadServices();
      loadMyApplications();
    } catch (err) {
      console.error("Error delivering service:", err);
      toast.error(err.message);
    }
  };

  const handleProposalChange = (serviceId, text) => {
    setProposalTexts((prev) => ({ ...prev, [serviceId]: text }));
  };

  const getStateName = (state) => {
    const states = [
      "Created",
      "Funded",
      "Assigned",
      "Delivered",
      "Approved",
      "Disputed",
      "Resolved",
    ];
    return states[state] || "Unknown";
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded shadow-md">
        <h2 className="text-xl font-bold">Provider Dashboard</h2>
        <p>Loading services...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">Provider Dashboard</h2>

      {/* Debug Information */}
      <div className="border border-yellow-600 p-3 rounded-lg bg-yellow-900">
        <h3 className="font-bold mb-2 text-yellow-300">Debug Information</h3>
        <pre className="text-xs whitespace-pre-wrap">
          {debugInfo || "No debug information yet"}
        </pre>
        <button
          onClick={() => {
            loadServices();
            loadMyApplications();
          }}
          className="mt-2 bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded"
        >
          Refresh Data
        </button>
      </div>

      {/* Available Services Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Available Services (Funded)</h3>
        {services.length === 0 ? (
          <div>
            <p>
              No available services. Services need to be created and funded by
              clients.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Current services are in state 0 (Created) but need to be in state
              1 (Funded). Ask a client to fund their services using the Client
              Dashboard.
            </p>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id.toString()} className="border p-2 mb-2">
              <p>
                <strong>ID:</strong> {service.id.toString()} -{" "}
                {service.description}
              </p>
              <p>
                <strong>Price:</strong> {ethers.formatEther(service.price)} ETH
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
                  className="w-full p-2 mb-2 text-white bg-gray-700 rounded"
                  rows="3"
                />
                <button
                  onClick={() =>
                    applyForService(service.id, proposalTexts[service.id] || "")
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
            <div key={index} className="border p-2 mb-2">
              <p>
                <strong>Service ID:</strong> {app.serviceId.toString()} -{" "}
                {app.service.description}
              </p>
              <p>
                <strong>Proposal:</strong> {app.proposal}
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
        {services.filter((service) => service.provider === signer?.address)
          .length === 0 ? (
          <p>No assigned services</p>
        ) : (
          services
            .filter((service) => service.provider === signer?.address)
            .map((service) => (
              <div key={service.id.toString()} className="border p-2 mb-2">
                <p>
                  <strong>ID:</strong> {service.id.toString()} -{" "}
                  {service.description}
                </p>
                <p>
                  <strong>Price:</strong> {ethers.formatEther(service.price)}{" "}
                  ETH
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
