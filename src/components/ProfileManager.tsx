import React, { useState, useEffect } from 'react';
import { ConnectionProfile, ProviderPresetId, VaultDropConfig } from '../types/provider';
import { PROVIDER_PRESETS, getPresetById } from '../lib/presets';
import { safeSaveDialog } from '../lib/tauriShim';

const STORAGE_KEY = 'vault_drop_profiles_v1';
const ACTIVE_PROFILE_KEY = 'vault_drop_active_profile_id';

interface ProfileManagerProps {
  currentProfile: Partial<ConnectionProfile>;
  onSelectProfile: (profile: ConnectionProfile) => void;
  onApplyPreset: (presetId: ProviderPresetId) => void;
  onSaveCurrentProfile: (profileName: string) => void;
  onNotify: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export function loadStoredProfiles(): ConnectionProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load profiles from localStorage', e);
  }
  return [];
}

export function saveStoredProfiles(profiles: ConnectionProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles to localStorage', e);
  }
}

export function loadActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function saveActiveProfileId(id: string) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  currentProfile,
  onSelectProfile,
  onApplyPreset,
  onSaveCurrentProfile,
  onNotify,
}) => {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileNameInput, setProfileNameInput] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const loaded = loadStoredProfiles();
    setProfiles(loaded);
    const activeId = loadActiveProfileId();
    if (activeId && loaded.some((p) => p.id === activeId)) {
      setSelectedProfileId(activeId);
    }
  }, []);

  const handleSaveProfile = () => {
    const name = profileNameInput.trim() || `${getPresetById(currentProfile.provider || 'aws').name} Profile`;
    onSaveCurrentProfile(name);
    setProfileNameInput('');
    // Refresh list
    setTimeout(() => {
      const updated = loadStoredProfiles();
      setProfiles(updated);
    }, 100);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    saveStoredProfiles(updated);
    if (selectedProfileId === id) {
      setSelectedProfileId('');
    }
    onNotify('Profile deleted', 'info');
  };

  const handleExportConfig = async () => {
    const configData: VaultDropConfig = {
      version: '1.0.0',
      activeProfileId: selectedProfileId,
      profiles: profiles,
    };
    const jsonStr = JSON.stringify(configData, null, 2);

    try {
      const path = await safeSaveDialog({
        defaultPath: 'vault-drop-config.json',
        filters: [{ name: 'JSON Config', extensions: ['json'] }],
      });

      if (path) {
        // In Tauri or browser environment download JSON file
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vault-drop-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onNotify('Exported profiles to vault-drop-config.json', 'success');
      }
    } catch (err: any) {
      onNotify(`Export failed: ${err.message || err}`, 'error');
    }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed: VaultDropConfig = JSON.parse(content);
        if (parsed && Array.isArray(parsed.profiles)) {
          const merged = [...profiles];
          let addedCount = 0;
          for (const newProf of parsed.profiles) {
            const existingIdx = merged.findIndex((p) => p.id === newProf.id || p.name === newProf.name);
            if (existingIdx >= 0) {
              merged[existingIdx] = newProf;
            } else {
              merged.push(newProf);
              addedCount++;
            }
          }
          setProfiles(merged);
          saveStoredProfiles(merged);
          onNotify(`Successfully imported ${addedCount} connection profiles`, 'success');
        } else {
          onNotify('Invalid config file format', 'error');
        }
      } catch (err: any) {
        onNotify(`Failed to parse JSON config: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Preset Schnell-Selector */}
      <div className="flex items-center gap-1">
        <label className="text-slate-400 font-medium whitespace-nowrap">Preset:</label>
        <select
          className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
          value={currentProfile.provider || 'aws'}
          onChange={(e) => onApplyPreset(e.target.value as ProviderPresetId)}
        >
          {PROVIDER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Saved Profiles Dropdown */}
      {profiles.length > 0 && (
        <div className="flex items-center gap-1">
          <label className="text-slate-400 font-medium whitespace-nowrap">Saved Profile:</label>
          <select
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 max-w-[180px]"
            value={selectedProfileId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedProfileId(id);
              saveActiveProfileId(id);
              const found = profiles.find((p) => p.id === id);
              if (found) {
                onSelectProfile(found);
              }
            }}
          >
            <option value="">-- Select Profile --</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({getPresetById(p.provider).name})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Profile Management Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={() => setIsModalOpen(!isModalOpen)}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition-colors"
          title="Manage Connection Profiles"
        >
          ⚙️ Profiles ({profiles.length})
        </button>
      </div>

      {/* Manage Profiles Drawer / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                📂 Connection Profiles & Config
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Save Current Connection */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 space-y-2">
              <label className="text-xs text-slate-300 font-medium block">
                Save Current Connection as Profile:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Profile Name (e.g. My MinIO Server)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                />
                <button
                  onClick={handleSaveProfile}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </div>

            {/* Profile List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                Saved Profiles ({profiles.length})
              </span>
              {profiles.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No saved profiles yet.</p>
              ) : (
                profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProfileId(p.id);
                      saveActiveProfileId(p.id);
                      onSelectProfile(p);
                      setIsModalOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border text-xs transition-colors ${
                      selectedProfileId === p.id
                        ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200'
                        : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{p.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {getPresetById(p.provider).name} • {p.endpoint || 'Default Endpoint'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProfile(p.id, e)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Delete profile"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Import / Export JSON Config */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer border border-slate-700 transition-colors">
                📥 Import JSON Config
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportConfig}
                />
              </label>
              <button
                onClick={handleExportConfig}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition-colors"
                disabled={profiles.length === 0}
              >
                📤 Export Config File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
