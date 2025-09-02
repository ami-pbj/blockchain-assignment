import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ProviderDashboard({ contract, signer }) {
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState({});
  const [proposalTexts, setProposalTexts] = useState({}); // Object to store proposals for each service
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, [contract]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const serviceCount = await contract.nextServiceId();
      const servicesArray = [];
      const applicationsData = {};

      for (let i = 0; i < serviceCount; i++) {
        try {
          const service = await contract.getService(i);
          servicesArray.push(service);

          // Load applications for funded services only
          if (service.state === 1) {
            try {
              // Check if application functions exist
              applicationsData[i] = [];

              // Try to load applications if the function exists
              try {
                const appCount = await contract.getApplicationCount(i);
                for (let j = 0; j < appCount; j++) {
                  const application = await contract.getApplication(i, j);
                  applicationsData[i].push(application);
                }
              } catch (error) {
                console.log("Application functions not available yet");
                applicationsData[i] = [];
              }
            } catch (error) {
              console.log("Error loading applications for service", i);
              applicationsData[i] = [];
            }
          }
        } catch (error) {
          console.log("Error loading service", i);
        }
      }

      setServices(servicesArray);
      setApplications(applicationsData);
    } catch (err) {
      console.error("Error loading services:", err);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const applyForService = async (serviceId, proposal) => {
    if (!proposal.trim()) {
      toast.error("Please enter a proposal");
      return;
    }

    try {
      const tx = await contract.applyForService(serviceId, proposal);
      await tx.wait();
      toast.success("Application submitted!");

      // Clear the proposal text for this service
      setProposalTexts((prev) => ({ ...prev, [serviceId]: "" }));

      loadServices();
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
      loadServices();
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

      {/* Available Services Section with Application */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Available Services</h3>
        {services.filter((service) => service.state === 1).length === 0 ? (
          <p>No available services</p>
        ) : (
          services
            .filter((service) => service.state === 1)
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
                  <strong>Client:</strong> {service.client}
                </p>

                {/* Application Form */}
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Your proposal..."
                    value={proposalTexts[service.id] || ""}
                    onChange={(e) =>
                      handleProposalChange(service.id, e.target.value)
                    }
                    className="w-full p-2 mb-2 text-white outline-none"
                  />
                  <button
                    onClick={() =>
                      applyForService(
                        service.id,
                        proposalTexts[service.id] || ""
                      )
                    }
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                  >
                    Apply for this Service
                  </button>
                </div>

                {/* Existing Applications */}
                {applications[service.id] &&
                  applications[service.id].length > 0 && (
                    <div className="mt-2">
                      <p>
                        <strong>Existing Applications:</strong>
                      </p>
                      {applications[service.id].map((app, index) => (
                        <div key={index} className="text-sm text-gray-300">
                          <p>
                            Provider: {app.provider} - Proposal: {app.proposal}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))
        )}
      </div>

      {/* My Assigned Services Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">My Assigned Services</h3>
        {services.filter((service) => service.provider === signer.address)
          .length === 0 ? (
          <p>No assigned services</p>
        ) : (
          services
            .filter((service) => service.provider === signer.address)
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

      {/* Completed Services Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Completed Services</h3>
        {services.filter(
          (service) =>
            service.provider === signer.address &&
            (service.state === 4 || service.state === 6)
        ).length === 0 ? (
          <p>No completed services</p>
        ) : (
          services
            .filter(
              (service) =>
                service.provider === signer.address &&
                (service.state === 4 || service.state === 6)
            )
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
              </div>
            ))
        )}
      </div>
    </div>
  );
}
