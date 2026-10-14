import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Edit2, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { UserAvatar } from '../components/UserAvatar.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import { toast } from '../components/ToastNotifications.js';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const { user, updateProfile, uploadAvatar } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [biography, setBiography] = useState(user?.biography ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setBiography(user.biography ?? '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(objectUrl);

    setIsUploading(true);
    try {
      await uploadAvatar?.(file);
      toast.success('Profile photo updated.');
    } catch (err) {
      setPhotoPreview(null);
      URL.revokeObjectURL(objectUrl);
      toast.error(err instanceof Error ? err.message : 'Profile photo could not be updated.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile?.({ displayName, biography });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.displayName ?? '');
    setBiography(user?.biography ?? '');
    setIsEditing(false);
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const privacySettings = user?.privacySettings;

  return (
    <div className="relative min-h-screen bg-[#030303] text-white overflow-auto">
      <AnimatedBackground />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Zap className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-white/50 text-sm mt-0.5">Manage your identity &amp; public presence</p>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Avatar & Basic Info */}
          <motion.div variants={itemVariants}>
            <GlassPanel className="p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    onClick={handleAvatarClick}
                    className="cursor-pointer relative"
                  >
                    <UserAvatar
                      username={user?.username}
                      displayName={user?.displayName}
                      photoUrl={photoPreview || user?.profilePhoto}
                      size="xl"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-white/30 mt-2">Click to change</p>
                </div>

                {/* Info */}
                <div className="flex-1 w-full space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-white/40 uppercase tracking-widest">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          maxLength={64}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                          placeholder="Your display name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-white/40 uppercase tracking-widest">
                          Biography
                        </label>
                        <textarea
                          value={biography}
                          onChange={(e) => setBiography(e.target.value)}
                          maxLength={256}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                          placeholder="Tell people about yourself…"
                        />
                        <p className="text-[10px] text-white/25 text-right">
                          {biography.length}/256
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 font-semibold text-sm transition-all disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-semibold text-sm transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {user?.displayName || user?.username}
                        </p>
                        <p className="text-white/40 text-sm">@{user?.username}</p>
                      </div>
                      {biography && (
                        <p className="text-white/60 text-sm leading-relaxed">{biography}</p>
                      )}
                      {formattedDate && (
                        <p className="text-xs text-white/30">Member since {formattedDate}</p>
                      )}
                      {saveSuccess && (
                        <p className="text-xs text-emerald-400">✓ Profile updated successfully</p>
                      )}
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    </>
                  )}
                </div>
              </div>
            </GlassPanel>
          </motion.div>

          {/* Privacy Settings (read-only summary) */}
          <motion.div variants={itemVariants}>
            <GlassPanel className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">Privacy Settings</h2>
                </div>
                <span className="text-xs text-white/30 italic">Edit in Settings</span>
              </div>
              {privacySettings ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Online Status',
                      value: privacySettings.presenceVisibility ?? 'contacts',
                    },
                    {
                      label: 'Last Active',
                      value: privacySettings.lastActiveVisibility ?? 'contacts',
                    },
                    {
                      label: 'Calls From',
                      value: privacySettings.callPermissions ?? 'contacts',
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="p-3 rounded-lg bg-white/3 border border-white/6 space-y-1"
                    >
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-medium text-white capitalize">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/30">Privacy settings not loaded.</p>
              )}
            </GlassPanel>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
