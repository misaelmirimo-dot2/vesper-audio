import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw, Shield } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminOverviewResponse {
  stats: {
    registeredUsers: number;
    cachedTracks: number;
    totalPlaylists: number;
    authorizedDownloads: number;
  };
  logs: Array<{
    id: number;
    eventType: string;
    endpoint: string;
    statusCode: number | null;
    detail: string | null;
    createdAt: string;
  }>;
  settings: {
    downloadsEnabledGlobally: boolean;
    apiCacheTtlSeconds: number;
    commercialModeEnforced: boolean;
  };
  jamendoCache: {
    entries: number;
    liveConfigured: boolean;
    baseUrl: string;
  };
}

export const AdminPage: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () =>
      apiFetch<AdminOverviewResponse>('/api/admin/overview', { token }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch('/api/admin/settings', {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-[#15151B] animate-pulse" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-[#1B1317] p-6 flex items-center justify-between">
        <span className="text-sm text-rose-200">
          Failed to load administration telemetry.
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
            <Shield className="w-4 h-4" />
            <span>Platform Administration</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#F5F5F7]">
            Licensing, Cache &amp; API Governance
          </h1>
        </div>

        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A38] bg-[#15151B] px-3.5 py-2 text-xs font-medium text-[#F5F5F7] hover:border-violet-500/40"
        >
          OpenAPI Specification
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Cached Tracks', data.stats.cachedTracks],
          ['User Playlists', data.stats.totalPlaylists],
          ['Authorized Downloads', data.stats.authorizedDownloads],
          ['Registered Users', data.stats.registeredUsers],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-[#22222E] bg-[#15151B] p-4"
          >
            <p className="text-xs text-[#9494A3]">{label}</p>
            <p className="mt-1 text-2xl font-bold font-mono-tabular text-[#F5F5F7]">
              {val}
            </p>
          </div>
        ))}
      </div>

      {/* Jamendo Integration & Policy Switches */}
      <section className="rounded-xl border border-[#22222E] bg-[#15151B] divide-y divide-[#22222E]">
        <div className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#F5F5F7]">
              Jamendo API v3.0 Mode
            </p>
            <p className="text-xs text-[#9494A3]">
              {data.jamendoCache.liveConfigured
                ? `Connected to ${data.jamendoCache.baseUrl} (${data.jamendoCache.entries} cached responses)`
                : 'Development catalog fallback active — configure JAMENDO_CLIENT_ID in server environment for live Jamendo queries.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateMutation.mutate({ clearCache: true })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A38] px-3.5 py-2 text-xs font-medium text-[#F5F5F7] hover:bg-[#1C1C24]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Purge API Cache
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#F5F5F7]">
              Global Offline Downloads
            </p>
            <p className="text-xs text-[#9494A3]">
              Administrative kill-switch. Disabling blocks all new download
              authorizations across the platform.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.settings.downloadsEnabledGlobally}
            aria-label="Toggle Global Offline Downloads"
            onClick={() =>
              updateMutation.mutate({
                downloadsEnabledGlobally:
                  !data.settings.downloadsEnabledGlobally,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              data.settings.downloadsEnabledGlobally
                ? 'bg-violet-600'
                : 'bg-[#2A2A38]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.settings.downloadsEnabledGlobally
                  ? 'translate-x-6'
                  : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#F5F5F7]">
              Enforce Platform Commercial Compliance
            </p>
            <p className="text-xs text-[#9494A3]">
              Require commercial-compatible Creative Commons licences (CC BY /
              CC BY-SA / CC BY-ND) for all downloads.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.settings.commercialModeEnforced}
            aria-label="Toggle Enforce Platform Commercial Compliance"
            onClick={() =>
              updateMutation.mutate({
                commercialModeEnforced: !data.settings.commercialModeEnforced,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              data.settings.commercialModeEnforced
                ? 'bg-violet-600'
                : 'bg-[#2A2A38]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.settings.commercialModeEnforced
                  ? 'translate-x-6'
                  : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#F5F5F7]">
              API Response Cache TTL
            </p>
            <p className="text-xs text-[#9494A3]">
              Controls how long Jamendo search and track metadata responses are
              cached in memory.
            </p>
          </div>
          <select
            aria-label="API Response Cache TTL"
            value={data.settings.apiCacheTtlSeconds}
            onChange={(e) =>
              updateMutation.mutate({
                apiCacheTtlSeconds: Number(e.target.value),
              })
            }
            className="rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3 py-2 text-xs text-[#F5F5F7]"
          >
            <option value={60}>60 seconds</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
            <option value={3600}>1 hour</option>
          </select>
        </div>
      </section>

      {/* Audit Logs */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#F5F5F7]">
          Recent API &amp; Licence Verification Logs
        </h2>
        <div className="rounded-xl border border-[#22222E] bg-[#15151B] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#22222E] text-[#9494A3]">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E28]">
              {data.logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-[#9494A3]"
                  >
                    No verification events logged yet. Trigger a search or
                    download authorization check to see entries here.
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#191922]">
                    <td className="px-4 py-2.5 font-medium text-[#F5F5F7] whitespace-nowrap">
                      {log.eventType}
                    </td>
                    <td className="px-4 py-2.5 font-mono-tabular text-[#9494A3] whitespace-nowrap">
                      {log.endpoint}
                    </td>
                    <td className="px-4 py-2.5 font-mono-tabular text-[#9494A3]">
                      {log.statusCode ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[#9494A3] max-w-md truncate">
                      {log.detail}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
