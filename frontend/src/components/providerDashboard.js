export default function ProviderDashboard({ contract, signer }) {
  const deliverService = async (serviceId) => {
    try {
      const tx = await contract.connect(signer).deliverService(serviceId);
      await tx.wait();
      alert("Service delivered!");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-3">
      <h2 className="text-xl font-bold">Provider Dashboard</h2>
      <p>List assigned services here...</p>
    </div>
  );
}
