import { useEffect, useState } from 'react';
import { Lock, Save, CheckCircle2, Circle, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminSettings, setAdminSetting, type SettingStatus } from '@/lib/api';

const ADMIN_TOKEN_KEY = 'surveyflow-admin-token';

const FIELD_GROUPS: { title: string; fields: { key: string; label: string; help?: string }[] }[] = [
  {
    title: 'CPX Research',
    fields: [
      { key: 'CPX_APP_ID', label: 'App ID' },
      { key: 'CPX_SECURE_HASH', label: 'Secure Hash' },
      { key: 'CPX_POSTBACK_SECRET', label: 'Postback Secret', help: 'From CPX dashboard, used to verify their webhook.' },
    ],
  },
  {
    title: 'BitLabs',
    fields: [
      { key: 'BITLABS_API_TOKEN', label: 'API Token' },
      { key: 'BITLABS_POSTBACK_SECRET', label: 'Postback Secret', help: 'Shared secret you set in BitLabs\' postback URL config.' },
    ],
  },
  {
    title: 'AdGate Media',
    fields: [
      { key: 'ADGATE_WALL_CODE', label: 'Wall Code' },
      { key: 'ADGATE_API_KEY', label: 'API Key' },
      { key: 'ADGATE_POSTBACK_SECRET', label: 'Postback Secret' },
    ],
  },
  {
    title: 'AI Ranking',
    fields: [{ key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', help: 'Optional — powers the "AI Rank" button on Opportunities.' }],
  },
];

function TokenGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setChecking(true);
    setError(null);
    try {
      await getAdminSettings(token);
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      onUnlock(token);
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith('501')
          ? "Server has no ADMIN_SETTINGS_TOKEN set yet — set one in server/.env and restart the API."
          : 'Incorrect admin token.'
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="glass-card p-8 max-w-md mx-auto text-center">
      <Lock className="w-8 h-8 text-brand-purple mx-auto mb-4" />
      <h3 className="text-lg font-heading font-semibold text-white mb-2">Admin token required</h3>
      <p className="text-sm text-white/60 mb-6">
        Enter the <code className="text-white/80">ADMIN_SETTINGS_TOKEN</code> set on your server to manage network API keys here.
      </p>
      <Input
        type="password"
        placeholder="Admin token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="bg-white/5 border-white/20 text-white mb-3"
      />
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <Button onClick={submit} disabled={!token || checking} className="w-full bg-gradient-to-r from-brand-purple to-brand-blue">
        {checking ? 'Checking...' : 'Unlock Settings'}
      </Button>
    </Card>
  );
}

function SettingField({
  field,
  status,
  adminToken,
  onSaved,
}: {
  field: { key: string; label: string; help?: string };
  status: SettingStatus | undefined;
  adminToken: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!value) return;
    setSaving(true);
    try {
      await setAdminSetting(adminToken, field.key, value);
      setValue('');
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="mt-2.5">
        {status?.configured ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <Circle className="w-4 h-4 text-white/20" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white">{field.label}</span>
          {status?.configured && (
            <span className="text-xs text-white/40 font-mono">
              {status.masked} {status.source === 'env' ? '(from server env)' : ''}
            </span>
          )}
        </div>
        {field.help && <p className="text-xs text-white/40 mb-2">{field.help}</p>}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={status?.configured ? 'Enter a new value to replace it' : 'Not set'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-white/5 border-white/20 text-white text-sm"
          />
          <Button size="sm" onClick={save} disabled={!value || saving} variant="outline" className="border-white/20 text-white hover:bg-white/10 shrink-0">
            {saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [settings, setSettings] = useState<SettingStatus[]>([]);

  const load = async (token: string) => {
    try {
      const res = await getAdminSettings(token);
      setSettings(res.settings);
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      setAdminToken(null);
    }
  };

  useEffect(() => {
    if (adminToken) load(adminToken);
  }, [adminToken]);

  const byKey = new Map(settings.map((s) => [s.key, s]));

  return (
    <section id="settings" className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-surface/50 to-brand-dark" />
      <div className="relative z-10 section-container">
        <div className="mb-10">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-white mb-3 flex items-center gap-3">
            <KeyRound className="w-8 h-8 text-brand-purple" />
            Network <span className="gradient-text">Settings</span>
          </h2>
          <p className="text-white/60 max-w-xl">
            Enter your survey network API keys here after deploying &mdash; no need to edit files on the server.
            Values are stored in the database and take effect immediately.
          </p>
        </div>

        {!adminToken ? (
          <TokenGate onUnlock={(t) => setAdminToken(t)} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {FIELD_GROUPS.map((group) => (
              <Card key={group.title} className="glass-card p-6">
                <h3 className="text-base font-heading font-semibold text-white mb-2">{group.title}</h3>
                <div>
                  {group.fields.map((field) => (
                    <SettingField
                      key={field.key}
                      field={field}
                      status={byKey.get(field.key)}
                      adminToken={adminToken}
                      onSaved={() => load(adminToken)}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
