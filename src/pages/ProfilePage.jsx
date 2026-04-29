import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SERVER_URL = 'https://phoenix-chess-server.onrender.com';

function getTier(rating) {
  if (rating < 800)  return { name: 'Beginner',             emoji: '🌱', color: 'text-green-400'  };
  if (rating < 1300) return { name: 'Intermediate',         emoji: '⭐', color: 'text-yellow-400' };
  if (rating < 1800) return { name: 'Advanced',             emoji: '⚔️', color: 'text-blue-400'   };
  if (rating < 2000) return { name: 'Master',               emoji: '👑', color: 'text-purple-400' };
  if (rating < 2300) return { name: 'International Master', emoji: '💎', color: 'text-cyan-400'   };
  return                    { name: 'Grandmaster',           emoji: '🔥', color: 'text-orange-400' };
}

export default function ProfilePage({ onBack }) {
  const { user, logout, refreshUser, token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-inter">
        <p className="text-muted-foreground">Not logged in</p>
        <button onClick={onBack} className="mt-4 text-sm text-primary">← Back</button>
      </div>
    );
  }

  const normalRatings = user.ratings?.normal || {};
  const phoenixRatings = user.ratings?.phoenix || {};
  const normalStats = user.stats?.normal || { wins: 0, losses: 0, draws: 0 };
  const phoenixStats = user.stats?.phoenix || { wins: 0, losses: 0, draws: 0 };

  const bestNormalRating = Math.max(...Object.values(normalRatings));
  const bestPhoenixRating = Math.max(...Object.values(phoenixRatings));
  const overallTier = getTier(Math.max(bestNormalRating, bestPhoenixRating));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${SERVER_URL}/profile/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName, bio }),
      });
      await refreshUser();
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const RatingCard = ({ label, rating }) => {
    const tier = getTier(rating);
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-center">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-lg font-black text-foreground">{rating}</div>
        <div className={`text-xs font-semibold ${tier.color}`}>{tier.emoji} {tier.name}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <div className="flex items-center px-4 py-3 border-b border-border">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Menu</button>
        <h2 className="flex-1 text-center font-bold text-foreground">Profile</h2>
        <button onClick={logout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile header */}
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">♞</span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:border-primary"
              />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Bio (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-black text-foreground">{user.displayName || user.username}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className={`text-sm font-bold mt-1 ${overallTier.color}`}>{overallTier.emoji} {overallTier.name}</div>
              {user.bio && <p className="text-xs text-muted-foreground mt-2">{user.bio}</p>}
              <div className="flex gap-3 justify-center mt-2 text-xs text-muted-foreground">
                <span>🔥 Best streak: {user.bestWinStreak}</span>
                <span>⚡ Streak: {user.winStreak}</span>
              </div>
              <button onClick={() => setEditing(true)} className="mt-3 text-xs text-primary hover:text-primary/80">Edit Profile</button>
            </>
          )}
        </div>

        {/* Normal Chess ratings */}
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2">♟ Normal Chess</h4>
          <div className="grid grid-cols-2 gap-2">
            <RatingCard label="Bullet" rating={normalRatings.bullet || 400} />
            <RatingCard label="Blitz" rating={normalRatings.blitz || 400} />
            <RatingCard label="Rapid" rating={normalRatings.rapid || 400} />
            <RatingCard label="Classical" rating={normalRatings.classical || 400} />
          </div>
          <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
            <span>✅ {normalStats.wins}W</span>
            <span>❌ {normalStats.losses}L</span>
            <span>🤝 {normalStats.draws}D</span>
          </div>
        </div>

        {/* Phoenix Core ratings */}
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2">🔥 Phoenix Core</h4>
          <div className="grid grid-cols-3 gap-2">
            <RatingCard label="Blitz" rating={phoenixRatings.blitz || 400} />
            <RatingCard label="Rapid" rating={phoenixRatings.rapid || 400} />
            <RatingCard label="Classical" rating={phoenixRatings.classical || 400} />
          </div>
          <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
            <span>✅ {phoenixStats.wins}W</span>
            <span>❌ {phoenixStats.losses}L</span>
            <span>🤝 {phoenixStats.draws}D</span>
          </div>
        </div>

        {/* Recent games */}
        <div>
          <h4 className="text-sm font-bold text-foreground mb-2">📋 Recent Games</h4>
          {user.matchHistory?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No games yet</p>
          )}
          {user.matchHistory?.slice(-10).reverse().map((match, i) => (
            <div key={i} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  match.result === 'win' ? 'bg-green-500/20 text-green-400' :
                  match.result === 'loss' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {match.result === 'win' ? 'WIN' : match.result === 'loss' ? 'LOSS' : 'DRAW'}
                </span>
                <span className="text-xs text-muted-foreground">vs {match.opponent}</span>
              </div>
              <span className={`text-xs font-bold ${match.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {match.ratingChange >= 0 ? '+' : ''}{match.ratingChange}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
         }
