import { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWallet } from "./hooks/useWallet";
import ClientDashboard from "./components/clientDashboard";
import ProviderDashboard from "./components/providerDashboard";
import AdminDashboard from "./components/adminDashboard";
import { getMarketplaceContract } from "./contracts/marketplace";
import MarketplaceDeployedAddress from "./contracts/MarketplaceAddress.json";

const CONTRACT_ADDRESS = MarketplaceDeployedAddress.address;

function App() {
  const { signer, account, connectWallet, isConnecting } = useWallet();
  const [contract, setContract] = useState(null);
  const [role, setRole] = useState("None");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkContract = async () => {
      if (signer && CONTRACT_ADDRESS) {
        try {
          const code = await signer.provider.getCode(CONTRACT_ADDRESS);
          console.log("Contract code:", code);
          if (code === "0x") {
            console.error("No contract found at address:", CONTRACT_ADDRESS);
            alert("No contract deployed at this address! Please deploy first.");
          } else {
            console.log("Contract found at address:", CONTRACT_ADDRESS);
          }
        } catch (error) {
          console.error("Error checking contract:", error);
        }
      }
    };

    checkContract();
  }, [signer]);

  useEffect(() => {
    const initializeContract = async () => {
      if (signer && account) {
        setLoading(true);
        try {
          const _contract = getMarketplaceContract(signer, CONTRACT_ADDRESS);
          setContract(_contract);

          // fetching user role - convert BigNumber to string for comparison
          const userRole = await _contract.roles(account);
          switch (userRole.toString()) {
            case "1":
              setRole("Client");
              break;
            case "2":
              setRole("Provider");
              break;
            case "3":
              setRole("Admin");
              break;
            default:
              setRole("None");
          }
        } catch (error) {
          console.error("Error initializing contract:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    initializeContract();
  }, [signer, account]);

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Connecting wallet...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
      {!account ? (
        <button
          onClick={connectWallet}
          className="text-lg"
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl mb-2 text-center">Marketplace dApp</h1>
          <p className="mb-2 text-center">
            Connected as: <span className="font-mono">{account}</span>
          </p>
          <p className="mb-4 text-center">Role: {role}</p>

          {role === "Client" && contract && (
            <ClientDashboard contract={contract} signer={signer} />
          )}
          {role === "Provider" && contract && (
            <ProviderDashboard contract={contract} signer={signer} />
          )}
          {role === "Admin" && contract && (
            <AdminDashboard contract={contract} signer={signer} />
          )}
          {role === "None" && (
            <div className="bg-gray-800 p-4 rounded shadow-md">
              <p>
                Your account doesn't have a role assigned. Please contact an
                admin.
              </p>
            </div>
          )}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

export default App;
