import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ClientDashboard({ contract, signer }) {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [services, setServices] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");

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
      }

      setServices(servicesArray);
    } catch (err) {
      console.error("Error loading services:", err);
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

  const assignProvider = async (serviceId, providerAddress) => {
    try {
      const tx = await contract.assignProvider(serviceId, providerAddress);
      await tx.wait();
      toast.success("Provider assigned!");
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
    return states[state] || "Unknown";
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">Client Dashboard</h2>

      {/* Create Service Section */}
      <div className="border p-3 rounded">
        <h3 className="font-bold mb-2">Create New Service</h3>
        <input
          type="text"
          placeholder="Service description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 mb-2 text-white"
        />
        <input
          type="text"
          placeholder="Price in ETH"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full p-2 mb-2 text-white"
        />
        <button
          onClick={createService}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Service
        </button>
      </div>

      {/* My Services Section */}
      <div className="border p-3 rounded">
        <h3 className="font-bold mb-2">My Services</h3>
        {services.filter((service) => service.client === signer.address)
          .length === 0 ? (
          <p>No services created</p>
        ) : (
          services
            .filter((service) => service.client === signer.address)
            .map((service) => (
              <div key={service.id.toString()} className="border p-2 mb-2">
                <p>
                  ID: {service.id.toString()} - {service.description}
                </p>
                <p>Price: {ethers.formatEther(service.price)} ETH</p>
                <p>State: {getStateName(service.state)}</p>
                <p>Provider: {service.provider || "Not assigned"}</p>

                <div className="flex space-x-2 mt-2 flex-wrap">
                  {service.state === 0 && (
                    <button
                      onClick={() => fundService(service.id, service.price)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                    >
                      Fund Service
                    </button>
                  )}

                  {service.state === 1 && (
                    <>
                      <input
                        type="text"
                        placeholder="Provider Address"
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="p-1 text-black"
                      />
                      <button
                        onClick={() =>
                          assignProvider(service.id, selectedProvider)
                        }
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                      >
                        Assign Provider
                      </button>
                    </>
                  )}

                  {service.state === 3 && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
