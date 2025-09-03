import { ethers } from "ethers";
import MarketplaceArtifact from "./MarketplaceABI.json";

export const getMarketplaceContract = (signerOrProvider, address) => {
  return new ethers.Contract(
    address,
    MarketplaceArtifact.abi,
    signerOrProvider
  );
};
