import { useState } from 'react';
import { Settings, Globe, Key, Mail, Bell, Shield, Database, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ConfigItem {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'toggle' | 'select';
  options?: string[];
  enabled?: boolean;
  sensitive?: boolean;
}

const SECTIONS: { title: string; icon: React.ReactNode; items: ConfigItem[] }[] = [
  {
    title: 'General',
    icon: <Globe className="w-4 h-4" />,
    items: [
      { key: 'platform_name',    label: 'Platform name',           value: 'SkipTheLine',                  type: 'text' },
      { key: 'support_email',    label: 'Support email',           value: 'support@skiptheline.gov.in',   type: 'text' },
      { key: 'default_timezone', label: 'Default timezone',        value: 'Asia/Kolkata',                 type: 'select', options: ['Asia/Kolkata', 'UTC', 'Asia/Dubai'] },
      { key: 'max_token_per_day',label: 'Max tokens per office/day',value: '500',                         type: 'text' },
    ],
  },
  {
    title: 'API & Integrations',
    icon: <Key className="w-4 h-4" />,
    items: [
      { key: 'api_base_url',  label: 'API base URL',         value: 'http://localhost:8000/api/v1', type: 'text' },
      { key: 'ws_base_url',   label: 'WebSocket URL',        value: 'ws://localhost:8000',          type: 'text' },
      { key: 'maps_provider', label: 'Maps provider',        value: 'OpenStreetMap',                type: 'select', options: ['OpenStreetMap', 'Google Maps', 'Mapbox'] },
    ],
  },
  {
    title: 'Notifications',
    icon: <Bell className="w-4 h-4" />,
    items: [
      { key: 'sms_enabled',        label: 'SMS notifications',     value: '',  type: 'toggle', enabled: false },
      { key: 'email_enabled',      label: 'Email notifications',   value: '',  type: 'toggle', enabled: true  },
      { key: 'push_enabled',       label: 'Push notifications',    value: '',  type: 'toggle', enabled: true  },
      { key: 'eta_alert_threshold',label: 'ETA alert threshold',   value: '10 min', type: 'select', options: ['5 min', '10 min', '15 min', '30 min'] },
    ],
  },
  {
    title: 'Security',
    icon: <Shield className="w-4 h-4" />,
    items: [
      { key: 'session_timeout',  label: 'Session timeout',      value: '8 hours',  type: 'select', options: ['1 hour', '4 hours', '8 hours', '24 hours'] },
      { key: 'mfa_required',     label: 'MFA for admin roles',  value: '',          type: 'toggle', enabled: false },
      { key: 'audit_retention',  label: 'Audit log retention',  value: '90 days',   type: 'select', options: ['30 days', '90 days', '180 days', '1 year'] },
      { key: 'ip_allowlist',     label: 'IP allowlist enabled', value: '',          type: 'toggle', enabled: false },
    ],
  },
  {
    title: 'Database & Cache',
    icon: <Database className="w-4 h-4" />,
    items: [
      { key: 'db_pool_size',      label: 'DB connection pool',   value: '20',        type: 'text' },
      { key: 'redis_ttl',         label: 'Redis cache TTL (s)',  value: '300',       type: 'text' },
      { key: 'queue_snapshot_interval', label: 'Queue snapshot interval', value: '30s', type: 'select', options: ['10s', '30s', '60s', '5 min'] },
    ],
  },
  {
    title: 'Email (SMTP)',
    icon: <Mail className="w-4 h-4" />,
    items: [
      { key: 'smtp_host',     label: 'SMTP host',      value: 'smtp.gov.in',          type: 'text' },
      { key: 'smtp_port',     label: 'SMTP port',      value: '587',                  type: 'text' },
      { key: 'smtp_user',     label: 'SMTP username',  value: 'noreply@gov.in',       type: 'text' },
      { key: 'smtp_password', label: 'SMTP password',  value: '••••••••••••',         type: 'text', sensitive: true },
    ],
  },
];

export default function SuperAdminConfigPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    sms_enabled: false, email_enabled: true, push_enabled: true,
    mfa_required: false, ip_allowlist: false,
  });
  const [values, setValues] = useState<Record<string, string>>({});

  const getValue = (item: ConfigItem) => values[item.key] ?? item.value;
  const getToggle = (item: ConfigItem) => toggles[item.key] ?? (item.enabled ?? false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Platform Configuration</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Platform-wide settings and integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)] disabled:opacity-60"
          >
            <Settings className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-800">
          <strong>Changes take effect immediately.</strong> Modifying API endpoints, security settings, or notification providers may impact live services. Test in a staging environment first.
        </p>
      </div>

      {/* Config sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {SECTIONS.map(section => (
          <div key={section.title} className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600">
                {section.icon}
              </div>
              <h3 className="text-[14px] font-black text-slate-900">{section.title}</h3>
            </div>

            <div className="space-y-4">
              {section.items.map(item => (
                <div key={item.key}>
                  {item.type === 'toggle' ? (
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-slate-700">{item.label}</label>
                      <button
                        onClick={() => setToggles(t => ({ ...t, [item.key]: !(t[item.key] ?? item.enabled ?? false) }))}
                        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${getToggle(item) ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        role="switch"
                        aria-checked={getToggle(item)}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                          style={{ transform: getToggle(item) ? 'translateX(22px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </div>
                  ) : item.type === 'select' ? (
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{item.label}</label>
                      <select
                        value={getValue(item)}
                        onChange={e => setValues(v => ({ ...v, [item.key]: e.target.value }))}
                        className="w-full liquid-glass-search rounded-xl px-3 py-2 text-[13px] text-slate-800 outline-none font-medium appearance-none cursor-pointer"
                      >
                        {item.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{item.label}</label>
                      <input
                        type={item.sensitive ? 'password' : 'text'}
                        value={getValue(item)}
                        onChange={e => setValues(v => ({ ...v, [item.key]: e.target.value }))}
                        className="w-full liquid-glass-search rounded-xl px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
