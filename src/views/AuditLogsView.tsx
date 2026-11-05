import React, { useEffect, useState } from 'react';
import { authFetch } from '../utils/api.ts';
import { Search, ShieldAlert, Clock, User } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/audit-logs')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.targetEntity.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Immutable Institutional Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident record of all administrative actions, promotions, allocations, and reviews.
          </p>
        </div>

        <div className="relative self-start">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search action, actor, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Action & Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Target: {log.targetEntity}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{log.actorEmail}</div>
                      <div className="text-[10px] font-mono text-slate-500">{log.actorRole}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-md">{log.details}</td>

                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp.split('T')[0]} {log.timestamp.split('T')[1]?.substring(0, 8)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
