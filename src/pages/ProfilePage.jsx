import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

function getTier(rating) {
  if (rating < 800)  return { name: 'Beginner',             emoji: '🌱', color: 'text-green-400'  };
  if (rating < 1300) return { name: 'Intermediate',         emoji: '⭐', color: 'text-yellow-400' };
  if (rating < 1800) return { name: 'Advanced',             emoji: '⚔️', color: 'text-blue-400'   };
  if (rating < 2000) return { name: 'Master',               emoji: '👑', color: 'text-purple-400' };
  if (rating < 2300) return { name: 'International Master', emoji: '💎', color: 'text-cyan-400'   };
  return                    { name: 'Grandmaster',           emoji: '🔥', color: 'text-orange-400' };
}

const NORMAL_FORMATS = [
  { key: 'bullet_30s', label: '30 sec',  cat: 'Bullet'    },
  { key: 'bullet_1m',  label: '1 min',   cat: 'Bullet'    },
  { key: 'bullet_2m',  label: '2 min',   cat: 'Bullet'    },
  { key: 'bullet_2p3', label: '2+3',     cat: 'Bullet'    },
  { key: 'blitz_3m',   label: '3 min',   cat: 'Blitz'     },
  { key: 'blitz_5m',   label: '5 min',   cat: 'Blitz'     },
  { key: 'blitz_5p5',  label: '5+5',     cat: 'Blitz'     },
  { key: 'rapid_7m',   label: '7 min',   cat: 'Rapid'     },
  { key: 'rapid_10m',  label: '10 min',  cat: 'Rapid'     },
  { key: 'rapid_15m',  label: '15 min',  cat: 'Rapid'     },
  { key: 'rapid_15p5', label: '15+5',    cat: 'Rapid'     },
  { key: 'classical_30m', label: '30 min', cat: 'Classical' },
];

const PHOENIX_FORMATS = [
  { key: 'blitz_4m',   label: '4 min',   cat: 'Blitz'     },
  { key: 'blitz_5m',   label: '5 min',   cat: 'Blitz'     },
  { key: 'blitz_5p6',  label: '5+6',     cat: 'Blitz'     },
  { key: 'rapid_7m',   label: '7 min',   cat: 'Rapid'     },
  { key: 'rapid_10m',  label: '10 min',  cat: 'Rapid'     },
  { key: 'rapid_15m',  label: '15 min',  cat: 'Rapid'     },
  { key: 'rapid_15p5', label: '15+5',    cat: 'Rapid'     },
  { key: 'classical_30m', label: '30 min', cat: 'Classical' },
];

const COUNTRY_FLAGS = [
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'US', flag: '🇺🇸', name: 'USA' },
  { code: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
];

function RatingRow({ label, cat, rating }) {
  const tier = getTier(rating || 400);
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <div>
        <span className="text-xs text-muted-foreground">{cat} · </span>
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-black ${tier.color}`}>{rating || 400}</span>
        <span className="text-xs">{tier.emoji}</span>
      </div>
    </div>
  );
}

export default function ProfilePage({ onBack }) {
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    country: user?.country || '',
    aim: user?.aim || '',
    flair: user?.flair || '',
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-inter">
        <p className="text-muted-foreground mb-4">Not logged in</p>
        <button onClick={onBack} className="text-sm text-primary">← Back</button>
      </div>
    );
  }

  const normalRatings = user.ratings?.normal || {};
  const phoenixRatings = user.ratings?.phoenix || {};
  const normalStats = user.stats?.normal || { wins: 0, losses: 0, draws: 0 };
  const phoenixStats = user.stats?.phoenix || { wins: 0, losses: 0, draws: 0 };

  const allNormalRatings = Object.values(normalRatings);
  const allPhoenixRatings = Object.values(phoenixRatings);
  const bestRating = Math.max(...allNormalRatings, ...allPhoenixRatings, 400);
  const overallTier = getTier(bestRating);

  const countryFlag = COUNTRY_FLAGS.find(c => c.code === user.country);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { alert('Image must be under 500KB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await updateProfile({ profilePic: ev.target.result });
      await refreshUser();
    };
    reader.readAsDataURL(file);
  };

  const tabs = ['profile', 'normal', 'phoenix', 'history'];

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <div className="flex items-center px-4 py-3 border-b border-border">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Menu</button>
        <h2 className="flex-1 text-center font-bold text-foreground">Profile</h2>
        <button onClick={logout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
              activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            {tab === 'normal' ? '♟ Chess' : tab === 'phoenix' ? '🔥 Phoenix' : tab === 'history' ? '📋 History' : '👤 Profile'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <>
            {/* Avatar */}
            <div className="bg-card border border-border rounded-2xl p-5 text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div
                  className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center cursor-pointer overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {user.profilePic
                    ? <img src={user.profilePic} alt="avatar" className="w-full h-full object-cover" />
                    : <span className="text-3xl">♞</span>
                  }
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  📷
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              {editing ? (
                <div className="space-y-2 text-left">
                  <input
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="Display name"
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Bio (optional)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:border-primary resize-none"
                  />
                  <input
                    value={form.aim}
                    onChange={e => setForm(f => ({ ...f, aim: e.target.value }))}
                    placeholder="Aim (e.g. Improve blitz rating)"
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                  <input
                    value={form.flair}
                    onChange={e => setForm(f => ({ ...f, flair: e.target.value }))}
                    placeholder="Flair emoji (e.g. 🏆)"
                    maxLength={4}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Country</p>
                    <div className="grid grid-cols-5 gap-1">
                      {COUNTRY_FLAGS.map(c => (
                        <button
                          key={c.code}
                          onClick={() => setForm(f => ({ ...f, country: f.country === c.code ? '' : c.code }))}
                          className={`py-1 rounded text-lg ${form.country === c.code ? 'bg-primary/20 border border-primary' : 'bg-secondary'}`}
                          title={c.name}
                        >
                          {c.flag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {user.flair && <span className="text-lg">{user.flair}</span>}
                    <h3 className="text-xl font-black text-foreground">{user.displayName || user.username}</h3>
                    {countryFlag && <span className="text-lg">{countryFlag.flag}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                  <div className={`text-sm font-bold mt-1 ${overallTier.color}`}>
                    {overallTier.emoji} {overallTier.name}
                  </div>
                  {user.bio && <p className="text-xs text-muted-foreground mt-2">{user.bio}</p>}
                  {user.aim && <p className="text-xs text-primary/80 mt-1">🎯 {user.aim}</p>}
                  <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                    <span>🔥 Best streak: {user.bestWinStreak || 0}</span>
                    <span>⚡ Current: {user.winStreak || 0}</span>
                  </div>
                  {(user.email || user.phone) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {user.email && <span>📧 {user.email}</span>}
                      {user.phone && <span>📱 {user.phone}</span>}
                    </div>
                  )}
                  <button onClick={() => { setForm({ displayName: user.displayName || '', bio: user.bio || '', country: user.country || '', aim: user.aim || '', flair: user.flair || '' }); setEditing(true); }}
                    className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
                    Edit Profile ✏️
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* NORMAL CHESS TAB */}
        {activeTab === 'normal' && (
          <>
            <div className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-sm font-bold text-foreground mb-3">♟ Normal Chess Ratings</h4>
              {NORMAL_FORMATS.map(f => (
                <RatingRow key={f.key} label={f.label} cat={f.cat} rating={normalRatings[f.key]} />
              ))}
            </div>
            <div className="flex gap-3 justify-center bg-card border border-border rounded-xl p-3">
              <span className="text-sm">✅ {normalStats.wins}W</span>
              <span className="text-sm">❌ {normalStats.losses}L</span>
              <span className="text-sm">🤝 {normalStats.draws}D</span>
              <span className="text-sm">📊 {normalStats.wins + normalStats.losses + normalStats.draws} games</span>
            </div>
          </>
        )}

        {/* PHOENIX CORE TAB */}
        {activeTab === 'phoenix' && (
          <>
            <div className="bg-card border border-border rounded-xl p-4">
              <h4 className="text-sm font-bold text-foreground mb-3">🔥 Phoenix Core Ratings</h4>
              {PHOENIX_FORMATS.map(f => (
                <RatingRow key={f.key} label={f.label} cat={f.cat} rating={phoenixRatings[f.key]} />
              ))}
            </div>
            <div className="flex gap-3 justify-center bg-card border border-border rounded-xl p-3">
              <span className="text-sm">✅ {phoenixStats.wins}W</span>
              <span className="text-sm">❌ {phoenixStats.losses}L</span>
              <span className="text-sm">🤝 {phoenixStats.draws}D</span>
              <span className="text-sm">📊 {phoenixStats.wins + phoenixStats.losses + phoenixStats.draws} games</span>
            </div>
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <>
            {(!user.matchHistory || user.matchHistory.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">📋</div>
                <p>No games played yet</p>
                <p className="text-xs mt-1">Play online to see your match history here</p>
              </div>
            )}
            {user.matchHistory?.slice().reverse().map((match, i) => (
              <div key={i} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    match.result === 'win'  ? 'bg-green-500/20 text-green-400' :
                    match.result === 'loss' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {match.result?.toUpperCase()}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-foreground">vs {match.opponent}</div>
                    <div className="text-xs text-muted-foreground">{match.mode} · {match.cat?.replace('_', ' ')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black ${(match.ratingChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(match.ratingChange || 0) >= 0 ? '+' : ''}{match.ratingChange || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.date ? new Date(match.date).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
                             }
