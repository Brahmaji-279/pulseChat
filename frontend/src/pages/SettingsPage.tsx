import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Bell,
  Palette,
  Smartphone,
  Trash2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useCryptoStore } from '../store/cryptoStore.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import { api } from '../services/api.js';

type Tab = 'account' | 'privacy' | 'security' | 'appearance' | 'notifications';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <Eye className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
];

const tabVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">{children}</p>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-violet-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#111] text-white">
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Account Tab ─────────────────────────────────────────────────────────────
function AccountTab() {
  const { user, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isPwSaving, setIsPwSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPassword !== confirmNew) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setIsPwSaving(true);
    try {
      await api.changePassword?.({ currentPassword, newPassword });
      setPwSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNew('');
    } catch (err: any) {
      setPwError(err?.message ?? 'Failed to change password.');
    } finally {
      setIsPwSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6 space-y-4">
        <SectionLabel>Change Password</SectionLabel>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="relative">
            <input
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNewPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type="password"
            value={confirmNew}
            onChange={(e) => setConfirmNew(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          {pwError && <p className="text-xs text-red-400">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-emerald-400">{pwSuccess}</p>}
          <button
            type="submit"
            disabled={isPwSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 font-semibold text-sm transition-all disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {isPwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </GlassPanel>

      <GlassPanel className="p-6 space-y-4 border-red-500/15">
        <SectionLabel>Danger Zone</SectionLabel>
        <button
          onClick={() => logout?.()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/8 hover:bg-red-500/15 border border-red-500/20 text-red-400 hover:text-red-300 text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-3">
            <p className="text-sm text-red-300 font-semibold">
              Are you sure? This action is irreversible.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => api.deleteAccount?.()}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Yes, delete my account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

// ─── Privacy Tab ─────────────────────────────────────────────────────────────
function PrivacyTab() {
  const { user } = useAuthStore();
  const [presence, setPresence] = useState(
    user?.privacySettings?.presenceVisibility ?? 'contacts'
  );
  const [lastActive, setLastActive] = useState(
    user?.privacySettings?.lastActiveVisibility ?? 'contacts'
  );
  const [calls, setCalls] = useState(user?.privacySettings?.callPermissions ?? 'contacts');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const visibilityOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'contacts', label: 'My Contacts' },
    { value: 'nobody', label: 'Nobody' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        privacySettings: {
          presenceVisibility: presence,
          lastActiveVisibility: lastActive,
          callPermissions: calls,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassPanel className="p-6 space-y-6">
      <SectionLabel>Visibility &amp; Permissions</SectionLabel>
      <div className="space-y-5">
        {[
          {
            label: 'Online Status (Presence)',
            description: 'Who can see when you are online',
            value: presence,
            setter: setPresence,
          },
          {
            label: 'Last Active Time',
            description: 'Who can see when you were last online',
            value: lastActive,
            setter: setLastActive,
          },
          {
            label: 'Incoming Calls',
            description: 'Who can call you',
            value: calls,
            setter: setCalls,
          },
        ].map(({ label, description, value, setter }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-white/40">{description}</p>
            </div>
            <SelectField value={value} onChange={setter} options={visibilityOptions} />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold text-sm transition-all disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Privacy Settings'}
      </button>
    </GlassPanel>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const { user } = useAuthStore();
  const { rotateKeys } = useCryptoStore();
  const [rotating, setRotating] = useState(false);

  const handleRotate = async () => {
    if (!user) return;
    setRotating(true);
    try {
      await rotateKeys(user.id, user.username);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="space-y-5">
      <GlassPanel className="p-6 space-y-4">
        <SectionLabel>Account Protection</SectionLabel>
        <p className="text-xs text-white/40 leading-relaxed">
          Private account credentials are not displayed on this page.
        </p>
        <button
          onClick={handleRotate}
          disabled={rotating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
          {rotating ? 'Refreshing…' : 'Refresh Account Protection'}
        </button>
      </GlassPanel>

      <GlassPanel className="p-6 space-y-4">
        <SectionLabel>Sessions</SectionLabel>
        <p className="text-xs text-white/40 leading-relaxed">
          Logging out all sessions will revoke all active tokens across all devices.
        </p>
        <button
          onClick={() => api.logoutAllSessions?.()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/8 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout All Sessions
        </button>
      </GlassPanel>
    </div>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────
function AppearanceTab() {
  const [reducedMotion, setReducedMotion] = useState(
    () => localStorage.getItem('pulsechat_reduced_motion') === 'true'
  );
  const [bgIntensity, setBgIntensity] = useState<'low' | 'medium' | 'high'>(
    () => (localStorage.getItem('pulsechat_bg_intensity') as 'low' | 'medium' | 'high') ?? 'medium'
  );

  const handleReducedMotion = (val: boolean) => {
    setReducedMotion(val);
    localStorage.setItem('pulsechat_reduced_motion', String(val));
  };

  const handleBgIntensity = (val: 'low' | 'medium' | 'high') => {
    setBgIntensity(val);
    localStorage.setItem('pulsechat_bg_intensity', val);
  };

  return (
    <GlassPanel className="p-6 space-y-6">
      <SectionLabel>Motion &amp; Animation</SectionLabel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Reduce Motion</p>
          <p className="text-xs text-white/40">Minimize animations for accessibility</p>
        </div>
        <ToggleSwitch checked={reducedMotion} onChange={handleReducedMotion} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Background Animation Intensity</p>
        <p className="text-xs text-white/40">Controls the animated background particle density</p>
        <div className="flex gap-2 mt-1">
          {(['low', 'medium', 'high'] as const).map((level) => (
            <button
              key={level}
              onClick={() => handleBgIntensity(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                bgIntensity === level
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [msgNotif, setMsgNotif] = useState(
    () => localStorage.getItem('pulsechat_notif_messages') !== 'false'
  );
  const [callNotif, setCallNotif] = useState(
    () => localStorage.getItem('pulsechat_notif_calls') !== 'false'
  );

  const handleMsgNotif = (val: boolean) => {
    setMsgNotif(val);
    localStorage.setItem('pulsechat_notif_messages', String(val));
  };

  const handleCallNotif = (val: boolean) => {
    setCallNotif(val);
    localStorage.setItem('pulsechat_notif_calls', String(val));
  };

  return (
    <GlassPanel className="p-6 space-y-6">
      <SectionLabel>Push Notifications</SectionLabel>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Message Notifications</p>
            <p className="text-xs text-white/40">Get notified when you receive new messages</p>
          </div>
          <ToggleSwitch checked={msgNotif} onChange={handleMsgNotif} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Call Notifications</p>
            <p className="text-xs text-white/40">Get notified about incoming calls</p>
          </div>
          <ToggleSwitch checked={callNotif} onChange={handleCallNotif} />
        </div>
      </div>
      <p className="text-xs text-white/25 leading-relaxed">
        Notification preferences are stored locally in your browser.
      </p>
    </GlassPanel>
  );
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('account');

  return (
    <div className="relative min-h-screen bg-[#030303] text-white overflow-auto">
      <AnimatedBackground />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-white/50 text-sm mt-1">Manage your account, privacy, and preferences</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 mb-6 overflow-x-auto"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {activeTab === 'account' && <AccountTab />}
            {activeTab === 'privacy' && <PrivacyTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
