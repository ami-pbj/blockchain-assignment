import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export default function ClientDashboard({ contract, signer }) {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const createService = async () => {
    try {
      const tx = await contract
        .connect(signer)
        .createService(description, ethers.parseEther(price));
      await tx.wait();
      toast.success("Service created!");
      setDescription("");
      setPrice("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-3">
      <h2 className="text-xl font-bold">Client Dashboard</h2>
      <input
        type="text"
        placeholder="Service description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="text"
        placeholder="Price in ETH"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button onClick={createService}>Create Service</button>
    </div>
  );
}
