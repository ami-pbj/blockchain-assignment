export default function AdminDashboard({ contract, signer }) {
  const resolveDispute = async (serviceId, approve) => {
    try {
      const tx = await contract
        .connect(signer)
        .resolveDispute(serviceId, approve);
      await tx.wait();
      alert("Dispute resolved!");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md space-y-3">
      <h2 className="text-xl font-bold">Admin Dashboard</h2>
      <p>List disputed services and approve/reject.</p>
    </div>
  );
}
