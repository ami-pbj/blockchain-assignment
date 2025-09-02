import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ProviderDashboard({ contract, signer }) {
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState({});
  const [proposalText, setProposalText] = useState("");

  useEffect(() => {
    loadServices();
  }, [contract]);

  const loadServices = async () => {
    try {
      const serviceCount = await contract.nextServiceId();
      const servicesArray = [];

      for (let i = 0; i < serviceCount; i++) {
        const service = await contract.getService(i);
        servicesArray.push(service);

        // Load applications for each service
        if (service.state === 1) {
          // Funded services only
          try {
            const appCount = await contract.getApplicationCount(i);
            const serviceApplications = [];
            for (let j = 0; j < appCount; j++) {
              const application = await contract.getApplication(i, j);
              serviceApplications.push(application);
            }
            setApplications((prev) => ({ ...prev, [i]: serviceApplications }));
          } catch (error) {
            console.log("No applications function or no applications");
          }
        }
      }

      setServices(servicesArray);
    } catch (err) {
      console.error("Error loading services:", err);
    }
  };

  const applyForService = async (serviceId, proposal) => {
    try {
      const tx = await contract.applyForService(serviceId, proposal);
      await tx.wait();
      toast.success("Application submitted!");
      loadServices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deliverService = async (serviceId) => {
    try {
      const tx = await contract.deliverService(serviceId);
      await tx.wait();
      toast.success("Service delivered!");
      loadServices();
    } catch (err) {
      toast.error(err.message);
    }
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

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">Provider Dashboard</h2>

      {/* Available Services Section with Application */}
      <div className="border p-3 rounded">
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
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    className="w-full p-2 mb-2 text-black"
                  />
                  <button
                    onClick={() => applyForService(service.id, proposalText)}
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
      <div className="border p-3 rounded">
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
      <div className="border p-3 rounded">
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
