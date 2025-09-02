import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ClientDashboard({ contract, signer }) {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState({});
  const [loadingApplications, setLoadingApplications] = useState({});

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
        if (service.state === 0 && service.client === signer.address) {
          // Created state
          loadApplicationsForService(i);
        }
      }

      setServices(servicesArray);
    } catch (err) {
      console.error("Error loading services:", err);
    }
  };

  const loadApplicationsForService = async (serviceId) => {
    try {
      setLoadingApplications((prev) => ({ ...prev, [serviceId]: true }));
      const applicationCount = await contract.getApplicationCount(serviceId);
      const apps = [];

      for (let i = 0; i < applicationCount; i++) {
        const application = await contract.getApplication(serviceId, i);
        apps.push(application);
      }

      setApplications((prev) => ({ ...prev, [serviceId]: apps }));
    } catch (err) {
      console.error("Error loading applications:", err);
    } finally {
      setLoadingApplications((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  const createService = async () => {
    try {
      const tx = await contract.createService(
        description,
        ethers.parseEther(price)
      );
      await tx.wait();
      toast.success("Service created!");
      setDescription("");
      setPrice("");
      loadServices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const acceptApplication = async (serviceId, applicationIndex) => {
    try {
      const tx = await contract.acceptApplication(serviceId, applicationIndex);
      await tx.wait();
      toast.success("Application accepted!");
      loadServices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fundService = async (serviceId, servicePrice) => {
    try {
      const tx = await contract.fundService(serviceId, {
        value: servicePrice,
      });
      await tx.wait();
      toast.success("Service funded!");
      loadServices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const approveService = async (serviceId) => {
    try {
      const tx = await contract.approveService(serviceId);
      await tx.wait();
      toast.success("Service approved!");
      loadServices();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const disputeService = async (serviceId) => {
    try {
      const tx = await contract.disputeService(serviceId);
      await tx.wait();
      toast.success("Service disputed!");
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
    return states[Number(state)] || "Unknown";
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">Client Dashboard</h2>

      {/* Create Service Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Create New Service</h3>
        <input
          type="text"
          placeholder="Service description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 mb-2 text-white outline-none"
        />
        <input
          type="text"
          placeholder="Price in ETH"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-2 mb-2 text-white outline-none"
        />
        <button
          onClick={createService}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Service
        </button>
      </div>

      {/* My Services Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">My Services</h3>
        {services.filter((service) => service.client === signer.address)
          .length === 0 ? (
          <p>No services created</p>
        ) : (
          services
            .filter((service) => service.client === signer.address)
            .map((service) => (
              <div
                key={service.id.toString()}
                className="border border-gray-700 rounded p-2 mb-2 text-sm"
              >
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
                  <strong>Provider:</strong>{" "}
                  {service.provider || "Not assigned"}
                </p>

                {/* Applications for Created services */}
                {service.state === 0 && (
                  <div className="mt-2">
                    <h4 className="font-bold">Applications:</h4>
                    {loadingApplications[service.id] ? (
                      <p>Loading applications...</p>
                    ) : applications[service.id]?.length > 0 ? (
                      applications[service.id].map((app, index) => (
                        <div key={index} className="border p-2 mt-2">
                          <p>
                            <strong>Provider:</strong> {app.provider}
                          </p>
                          <p>
                            <strong>Proposal:</strong> {app.proposal}
                          </p>
                          <button
                            onClick={() => acceptApplication(service.id, index)}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mt-1"
                            disabled={app.accepted}
                          >
                            {app.accepted ? "Accepted" : "Accept Application"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>No applications yet</p>
                    )}
                  </div>
                )}

                {/* Fund button for Assigned services */}
                {service.state === 2 && (
                  <button
                    onClick={() => fundService(service.id, service.price)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mt-2"
                  >
                    Fund Service
                  </button>
                )}

                {/* Approve/Dispute buttons for Delivered services */}
                {service.state === 3 && (
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={() => approveService(service.id)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => disputeService(service.id)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                    >
                      Dispute
                    </button>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
