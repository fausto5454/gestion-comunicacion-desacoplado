import { Mail, Inbox, MailCheck, MailX } from "lucide-react";

const KPI = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const KPIsReportes = ({ stats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
    <KPI title="Total" value={stats.total} icon={Mail} color="bg-green-600" />
    <KPI title="Enviados" value={stats.enviados} icon={Inbox} color="bg-blue-600" />
    <KPI title="Recibidos" value={stats.recibidos} icon={Inbox} color="bg-indigo-600" />
    <KPI title="Leídos" value={stats.leidos} icon={MailCheck} color="bg-emerald-600" />
    <KPI title="No Leídos" value={stats.noLeidos} icon={MailX} color="bg-red-600" />
  </div>
);

export default KPIsReportes;
