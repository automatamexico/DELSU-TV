import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DashboardPage = () => {
  const [channels, setChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulación de carga de canales
    setChannels([
      { id: 1, name: "Canal 1" },
      { id: 2, name: "Canal 2" },
    ]);
  }, []);

  const handleDelete = (id) => {
    // ✅ Corregido: usar window.confirm en lugar de confirm
    if (!window.confirm("¿Seguro que quieres eliminar este canal?")) return;

    setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEdit = (id) => {
    navigate(`/dashboard/edit/${id}`);
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Panel de administración</h1>

      <ul className="space-y-2">
        {channels.map((channel) => (
          <li
            key={channel.id}
            className="flex justify-between items-center bg-gray-800 p-4 rounded-lg"
          >
            <span>{channel.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(channel.id)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(channel.id)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardPage;
