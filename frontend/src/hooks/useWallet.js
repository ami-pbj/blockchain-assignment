import { useState, useEffect } from "react";
import { ethers } from "ethers";

export const useWallet = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // checking if wallet is already connected on component mount
  useEffect(() => {
    const checkConnectedWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (err) {
          console.error("Error checking connected wallet:", err);
        }
      }
    };

    checkConnectedWallet();
  }, []);

  // connecting the wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      setIsConnecting(true);
      try {
        // requesting account access
        await window.ethereum.request({ method: "eth_requestAccounts" });

        const _provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(_provider);

        const _signer = await _provider.getSigner();
        setSigner(_signer);

        // getting account address
        const _account = await _signer.getAddress();
        setAccount(_account);

        // setting up event listeners
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
      } catch (err) {
        console.error("Wallet connection failed:", err);
        alert("Wallet connection failed: " + err.message);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
      setProvider(null);
    } else {
      setAccount(accounts[0]);
      if (provider) {
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
      }
    }
  };

  const handleChainChanged = () => {
    // refresh the page when network changes
    window.location.reload();
  };

  // cleaning up event listeners
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // disconnect the wallet
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
  };

  return {
    provider,
    signer,
    account,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
};
