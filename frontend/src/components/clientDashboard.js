import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ClientDashboard({ contract, signer }) {
  const [description, setDescription] = useState("");
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [funding, setFunding] = useState(false);

  useEffect(() => {
    if (contract && signer) {
      loadServices();
    }
  }, [contract, signer]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const serviceCount = await contract.nextServiceId();
      const servicesArray = [];

      for (let i = 0; i < serviceCount; i++) {
        try {
          const service = await contract.getService(i);
          servicesArray.push(service);

          // Load applications for services that belong to this client
          if (service.client === signer.address) {
            await loadApplicationsForService(i);
          }
        } catch (error) {
          console.error(`Error loading service ${i}:`, error);
        }
      }

      setServices(servicesArray);
    } catch (err) {
      console.error("Error loading services:", err);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const loadApplicationsForService = async (serviceId) => {
    try {
      const applicationCount = await contract.getApplicationCount(serviceId);
      const apps = [];

      for (let i = 0; i < applicationCount; i++) {
        try {
          const application = await contract.getApplication(serviceId, i);
          apps.push(application);
        } catch (error) {
          console.error(`Error loading application ${i}:`, error);
        }
      }

      setApplications((prev) => ({ ...prev, [serviceId]: apps }));
    } catch (err) {
      console.error(
        `Error loading applications for service ${serviceId}:`,
        err
      );
    }
  };

  const createService = async () => {
    if (!description.trim()) return toast.error("Please enter a description");

    try {
      const tx = await contract.createService(description);
      await tx.wait();
      toast.success("Service created!");
      setDescription("");
      loadServices();
    } catch (err) {
      console.error("Error creating service:", err);
      toast.error(err.reason || err.message);
    }
  };

  const acceptApplication = async (serviceId, applicationIndex) => {
    try {
      setAccepting(true);

      const tx = await contract.acceptApplication(serviceId, applicationIndex);
      await tx.wait();

      toast.success("Application accepted! Provider assigned.");
      await loadServices();
    } catch (err) {
      console.error("Error accepting application:", err);

      if (err.message.includes("Not the service client")) {
        toast.error("You are not the owner of this service");
      } else if (err.message.includes("Application already accepted")) {
        toast.error("This application is already accepted");
      } else if (err.message.includes("Invalid state")) {
        toast.error("Service is not in the correct state");
      } else if (err.message.includes("Invalid application")) {
        toast.error("Invalid application index");
      } else {
        toast.error(
          err.reason || err.message || "Failed to accept application"
        );
      }
    } finally {
      setAccepting(false);
    }
  };

  const fundService = async (serviceId, servicePrice) => {
    try {
      setFunding(true);

      const tx = await contract.fundService(serviceId, {
        value: servicePrice,
      });
      await tx.wait();

      toast.success("Service funded! ETH deposited to escrow.");
      loadServices();
    } catch (err) {
      console.error("Error funding service:", err);

      if (err.message.includes("Incorrect ETH amount")) {
        toast.error(
          `Please send exactly ${ethers.formatEther(servicePrice)} ETH`
        );
      } else if (err.message.includes("Not the service client")) {
        toast.error("You are not the owner of this service");
      } else if (err.message.includes("Invalid state")) {
        toast.error("Service is not in the correct state for funding");
      } else {
        toast.error(err.reason || err.message || "Failed to fund service");
      }
    } finally {
      setFunding(false);
    }
  };

  const approveService = async (serviceId) => {
    try {
      const tx = await contract.approveService(serviceId);
      await tx.wait();
      toast.success("Service approved! Payment released to provider.");
      loadServices();
    } catch (err) {
      console.error("Error approving service:", err);
      toast.error(err.reason || err.message);
    }
  };

  const getStateName = (state) => {
    const states = [
      "Created",
      "Assigned",
      "Funded",
      "Delivered",
      "Approved",
      "Disputed",
      "Resolved",
    ];
    return states[Number(state)] || "Unknown";
  };

  if (loading) {
    return <div className="p-4">Loading services...</div>;
  }

  const myServices = services.filter(
    (service) => service.client === signer?.address
  );
  const servicesWithApplications = myServices.filter(
    (service) => applications[service.id]?.length > 0
  );

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">Client Dashboard</h2>

      {/* Create Service */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Create New Service</h3>
        <input
          type="text"
          placeholder="Service description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 mb-2 bg-gray-700 text-white rounded outline-none"
        />
        <button
          onClick={createService}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Service
        </button>
      </div>

      {/* Applications from Providers */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Applications from Providers</h3>
        {servicesWithApplications.length === 0 ? (
          <p>No applications received yet</p>
        ) : (
          servicesWithApplications.map((service) => (
            <div
              key={service.id.toString()}
              className="border border-gray-700 bg-[#11111180] rounded p-2 mb-2 text-sm"
            >
              <p>
                <strong>Service ID:</strong> {service.id.toString()} -{" "}
                {service.description}
              </p>
              <p>
                <strong>State:</strong> {getStateName(service.state)}
              </p>

              <div className="mt-2">
                <h4 className="font-bold">Provider Applications:</h4>
                {applications[service.id]?.map((app, index) => (
                  <div key={index} className="border border-gray-700 rounded p-2 mt-2">
                    <p>
                      <strong>Provider:</strong> {app.provider}
                    </p>
                    <p>
                      <strong>Proposal:</strong> {app.proposal}
                    </p>
                    <p>
                      <strong>Proposed Price:</strong>{" "}
                      {ethers.formatEther(app.price)} ETH
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {app.accepted ? (
                        <span className="text-green-500">Accepted ✓</span>
                      ) : (
                        <span className="text-yellow-500">Pending</span>
                      )}
                    </p>

                    {/* Accept Button for Pending Applications */}
                    {service.state === 0 && !app.accepted && (
                      <button
                        onClick={() => acceptApplication(service.id, index)}
                        disabled={accepting}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mt-1 disabled:bg-gray-400"
                      >
                        {accepting ? "Accepting..." : "Accept Application"}
                      </button>
                    )}

                    {/* Fund Button for Accepted Applications */}
                    {app.accepted && service.state === 1 && (
                      <button
                        onClick={() => fundService(service.id, service.price)}
                        disabled={funding}
                        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mt-1 disabled:bg-gray-400"
                      >
                        {funding
                          ? "Funding..."
                          : `Fund Service (${ethers.formatEther(
                              service.price
                            )} ETH)`}
                      </button>
                    )}

                    {/* Approve Button for Delivered Services */}
                    {service.state === 3 && (
                      <button
                        onClick={() => approveService(service.id)}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mt-1"
                      >
                        Approve & Pay Provider
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simple Services List */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">
          My Created Services ({myServices.length})
        </h3>

        {myServices.length === 0 ? (
          <p>No services created yet</p>
        ) : (
          myServices.map((service) => (
            <div
              key={service.id.toString()}
              className="border border-gray-700 rounded p-2 mb-2 text-sm"
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
                <strong>Provider:</strong>{" "}
                {service.provider !== ethers.ZeroAddress
                  ? service.provider
                  : "Not assigned"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
