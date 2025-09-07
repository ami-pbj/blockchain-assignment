import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ClientDashboard({ contract, signer }) {
  const [description, setDescription] = useState("");
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentAction, setCurrentAction] = useState("");

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
      setCurrentAction("accepting");

      const tx = await contract.acceptApplication(serviceId, applicationIndex);
      await tx.wait();

      toast.success("Application accepted! Provider assigned.");
      loadServices();
    } catch (err) {
      console.error("Error accepting application:", err);
      toast.error(err.reason || err.message || "Failed to accept application");
    } finally {
      setCurrentAction("");
    }
  };

  const fundService = async (serviceId, servicePrice) => {
    try {
      setCurrentAction("funding");

      const tx = await contract.fundService(serviceId, {
        value: servicePrice,
      });
      await tx.wait();

      toast.success("Service funded! ETH deposited to escrow.");
      loadServices();
    } catch (err) {
      console.error("Error funding service:", err);
      toast.error(err.reason || err.message || "Failed to fund service");
    } finally {
      setCurrentAction("");
    }
  };

  const approveService = async (serviceId) => {
    try {
      setCurrentAction("approving");

      const tx = await contract.approveService(serviceId);
      await tx.wait();

      toast.success("Service approved! Payment released to provider.");
      loadServices();
    } catch (err) {
      console.error("Error approving service:", err);
      toast.error(err.reason || err.message);
    } finally {
      setCurrentAction("");
    }
  };

  const disputeService = async (serviceId) => {
    try {
      setCurrentAction("disputing");

      const tx = await contract.disputeService(serviceId);
      await tx.wait();

      toast.success("Service disputed! Admin will review the case.");
      loadServices();
    } catch (err) {
      console.error("Error disputing service:", err);
      if (err.message.includes("Invalid state")) {
        toast.error("Service is not in the correct state for dispute");
      } else if (err.message.includes("Not the service client")) {
        toast.error("You are not the owner of this service");
      } else {
        toast.error(err.reason || err.message || "Failed to dispute service");
      }
    } finally {
      setCurrentAction("");
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
                <strong>State:</strong> {getStateName(service.state)} (State:{" "}
                {service.state})
              </p>

              <div className="mt-2">
                <h4 className="font-bold">Provider Applications:</h4>
                {applications[service.id]?.map((app, index) => (
                  <div
                    key={index}
                    className="border border-gray-700 rounded p-2 mt-2"
                  >
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
                    <p>
                      {service.deliveryDescription && (
                        <span>
                          <strong>Delivery Info:</strong>{" "}
                          {service.deliveryDescription}
                        </span>
                      )}
                    </p>

                    {/* DEBUGGING: Show raw data */}
                    {/* <div className="text-xs text-gray-400 mt-2">
                      <p>
                        DEBUG: Service State: {service.state} | App Accepted:{" "}
                        {app.accepted.toString()}
                      </p>
                    </div> */}

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 mt-3">
                      {/* Accept Button - Only for State 0 (Created) */}
                      {Number(service.state) === 0 && !app.accepted && (
                        <button
                          onClick={() => acceptApplication(service.id, index)}
                          disabled={currentAction !== ""}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded disabled:bg-gray-400"
                        >
                          {currentAction === "accepting"
                            ? "Accepting..."
                            : "Accept Application"}
                        </button>
                      )}

                      {/* Fund Button - Only for State 1 (Assigned) */}
                      {Number(service.state) === 1 && app.accepted && (
                        <button
                          onClick={() => fundService(service.id, service.price)}
                          disabled={currentAction !== ""}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded disabled:bg-gray-400"
                        >
                          {currentAction === "funding"
                            ? "Funding..."
                            : `Fund Service (${ethers.formatEther(
                                service.price
                              )} ETH)`}
                        </button>
                      )}

                      {/* Waiting for Delivery - State 2 (Funded) */}
                      {Number(service.state) === 2 && (
                        <div className="bg-blue-500 text-white p-2 rounded">
                          <p>Waiting for provider to deliver the work...</p>
                          <p className="text-xs">
                            Provider: {service.provider}
                          </p>
                        </div>
                      )}

                      {/* Approve/Dispute Buttons - Only for State 3 (Delivered) */}
                      {Number(service.state) === 3 && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => approveService(service.id)}
                            disabled={currentAction !== ""}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded disabled:bg-gray-400"
                          >
                            {currentAction === "approving"
                              ? "Approving..."
                              : "✅ Approve Service"}
                          </button>
                          <button
                            onClick={() => disputeService(service.id)}
                            disabled={currentAction !== ""}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded disabled:bg-gray-400"
                          >
                            {currentAction === "disputing"
                              ? "Disputing..."
                              : "⚠️ Dispute Service"}
                          </button>
                        </div>
                      )}

                      {/* Completed/Resolved States */}
                      {Number(service.state) === 4 && (
                        <div className="bg-[#000000] text-green-500 p-2 rounded">
                          <p>Service completed and paid successfully</p>
                        </div>
                      )}

                      {Number(service.state) === 5 && (
                        <div className="bg-[#000000] text-red-500 p-2 rounded">
                          <p>Service disputed - Waiting for admin resolution</p>
                        </div>
                      )}

                      {Number(service.state) === 6 && (
                        <div className="bg-gray-500 text-white p-2 rounded">
                          <p>Service resolved by admin and refunded</p>
                        </div>
                      )}
                    </div>
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
                <strong>State:</strong> {getStateName(service.state)} (
                {service.state})
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
