const TablaReportes = ({ data }) => (
  <div className="bg-white rounded-xl shadow-md p-6 overflow-x-auto">
    <h3 className="font-semibold mb-4">Reporte por Usuario</h3>

    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="pb-2">Usuario</th>
          <th className="pb-2">Enviados</th>
          <th className="pb-2">Recibidos</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([user, valores]) => (
          <tr key={user} className="border-b">
            <td className="py-2 font-medium text-gray-700">{user}</td>
            <td>{valores.enviados}</td>
            <td>{valores.recibidos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TablaReportes;
