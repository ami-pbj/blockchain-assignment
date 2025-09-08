import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function AdminDashboard({ contract, signer }) {
  const [disputedServices, setDisputedServices] = useState([]);
  const [userAddress, setUserAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("1");
  const [services, setServices] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [adminAddress, setAdminAddress] = useState("");

  // Fetch admin (contract owner)
  useEffect(() => {
    const fetchAdmin = async () => {
      if (contract) {
        try {
          const _admin = await contract.owner(); // from Ownable
          setAdminAddress(_admin.toLowerCase());
        } catch (err) {
          console.error("Error fetching admin:", err);
        }
      }
    };
    fetchAdmin();
  }, [contract]);

  useEffect(() => {
    if (contract && signer) {
      loadDisputedServices();
      loadAllServices();
    }
  }, [contract, signer]);

  const loadAllServices = async () => {
    try {
      const serviceCount = await contract.nextServiceId();
      const servicesArray = [];

      for (let i = 0; i < serviceCount; i++) {
        try {
          const service = await contract.getService(i);
          servicesArray.push(service);
        } catch (error) {
          console.error(`Error loading service ${i}:`, error);
        }
      }

      setServices(servicesArray);
    } catch (err) {
      console.error("Error loading services:", err);
      toast.error("Failed to load services");
    }
  };

  const loadDisputedServices = async () => {
    try {
      // Use the new getDisputedServices function from the contract
      const disputed = await contract.getDisputedServices();
      setDisputedServices(disputed);
    } catch (err) {
      console.error(
        "Error loading disputed services using getDisputedServices:",
        err
      );

      // Fallback to manual loading if the new function doesn't exist yet
      try {
        const serviceCount = await contract.nextServiceId();
        const disputed = [];

        for (let i = 0; i < serviceCount; i++) {
          try {
            const service = await contract.getService(i);
            if (service.state === 5) {
              // Disputed state
              disputed.push(service);
            }
          } catch (error) {
            console.error(`Error loading service ${i}:`, error);
          }
        }

        setDisputedServices(disputed);
      } catch (fallbackErr) {
        console.error("Fallback loading also failed:", fallbackErr);
        toast.error("Failed to load disputed services");
      }
    }
  };

  // Validate Ethereum address
  const isValidEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const assignRole = async () => {
    if (!isValidEthereumAddress(userAddress)) {
      toast.error("Please enter a valid Ethereum address (0x...)");
      return;
    }

    if (userAddress.toLowerCase() === adminAddress) {
      toast.error("Cannot change the role of the Admin address");
      return;
    }

    setIsAssigning(true);
    try {
      const tx = await contract.setRole(userAddress, selectedRole);
      await tx.wait();
      toast.success("Role assigned successfully!");
      setUserAddress("");
    } catch (err) {
      console.error("Error assigning role:", err);
      if (err.data && err.data.includes("0x118cdaa7")) {
        toast.error("Only the contract owner can assign roles");
      } else if (err.message.includes("Unauthorized")) {
        toast.error("Only admin can assign roles");
      } else {
        toast.error("Transaction failed: " + err.message);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const resolveDispute = async (serviceId, approve) => {
    try {
      const tx = await contract.resolveDispute(serviceId, approve);
      await tx.wait();
      toast.success(`Dispute ${approve ? "approved" : "rejected"}!`);
      loadDisputedServices();
      loadAllServices();
    } catch (err) {
      console.error("Error resolving dispute:", err);
      toast.error("Failed to resolve dispute");
    }
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
      <h2 className="text-xl font-bold">Admin Dashboard</h2>

      {/* Role Assignment Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">Assign Roles</h3>
        <input
          type="text"
          placeholder="User Address (0x...)"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          className="w-full p-2 mb-2 text-white outline-none"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full p-2 mb-2 text-white rounded bg-black/60 border border-gray-700 outline-none"
        >
          <option value="1">Client</option>
          <option value="2">Provider</option>
          {/* <option value="3">Admin</option> */}
        </select>
        <button
          onClick={assignRole}
          disabled={isAssigning}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
        >
          {isAssigning ? "Assigning..." : "Assign Role"}
        </button>

        <div className="mt-3 text-sm text-gray-400">
          <p>Sample addresses from Hardhat:</p>
          <p>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Admin)</p>
          <p>0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Client)</p>
          <p>0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Provider)</p>
        </div>
      </div>

      {/* Dispute Resolution Section */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">
          Disputed Services ({disputedServices.length})
        </h3>
        {disputedServices.length === 0 ? (
          <p>No disputed services</p>
        ) : (
          disputedServices.map((service) => (
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
              <p>
                <strong>Provider:</strong> {service.provider}
              </p>
              <p>
                <strong>Price:</strong> {ethers.formatEther(service.price)} ETH
              </p>
              <p>
                <strong>Delivery Description:</strong>{" "}
                {service.deliveryDescription || "Not provided"}
              </p>
              <p>
                <strong>State:</strong> {getStateName(service.state)}
              </p>

              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => resolveDispute(service.id, true)}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                >
                  Approve (Pay Provider)
                </button>
                <button
                  onClick={() => resolveDispute(service.id, false)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                >
                  Reject (Refund Client)
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* All Services Overview */}
      <div className="border border-gray-600 p-3 rounded-lg">
        <h3 className="font-bold mb-2">All Services ({services.length})</h3>
        {services.length === 0 ? (
          <p>No services created yet</p>
        ) : (
          services.map((service) => (
            <div
              key={service.id.toString()}
              className="border border-gray-700 rounded p-2 mb-2 text-sm"
            >
              <p>
                <strong>ID:</strong> {service.id.toString()} |{" "}
                <strong>State:</strong> {getStateName(service.state)}
              </p>
              <p>
                <strong>Description:</strong> {service.description}
              </p>
              <p>
                <strong>Price:</strong> {ethers.formatEther(service.price)} ETH
              </p>
              <p>
                <strong>Client:</strong> {service.client}
              </p>
              <p>
                <strong>Provider:</strong>{" "}
                {service.provider !== ethers.ZeroAddress
                  ? service.provider
                  : "Not assigned"}
              </p>
              {service.deliveryDescription && (
                <p>
                  <strong>Delivery Info:</strong> {service.deliveryDescription}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
