import { Clock, Users, Flag, FileText } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import { useSceneStore } from '../../store/sceneStore';
import { Section } from '../shared/Section';

export function DashboardView() {
  const { campaignClock, notes, flags, favorites, recentScenes } = useSessionStore();
  const { scenes, goToSceneById } = useSceneStore();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Campaign Clock */}
      <Section title="Campaign Clock" icon={Clock}>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-mono text-cyan-400">
            Day {campaignClock.day}
          </div>
          <div className="text-2xl font-mono text-neutral-300">
            {campaignClock.time}
          </div>
        </div>
      </Section>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Scenes"
          value={scenes.length}
        />
        <StatCard
          icon={<Flag size={20} />}
          label="Flags Set"
          value={Object.values(flags).filter(Boolean).length}
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Notes"
          value={notes.length}
        />
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <Section title="Favorite Locations">
          <div className="flex flex-wrap gap-2">
            {favorites.map((sceneId) => {
              const scene = scenes.find((s) => s.id === sceneId);
              return scene ? (
                <button
                  key={sceneId}
                  onClick={() => goToSceneById(sceneId)}
                  className="btn btn-secondary"
                >
                  {scene.title}
                </button>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Recent Scenes */}
      {recentScenes.length > 0 && (
        <Section title="Recently Visited">
          <ul className="space-y-1">
            {recentScenes.slice(0, 5).map((sceneId) => {
              const scene = scenes.find((s) => s.id === sceneId);
              return scene ? (
                <li key={sceneId}>
                  <button
                    onClick={() => goToSceneById(sceneId)}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {scene.title}
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        </Section>
      )}

      {/* Session Notes Preview */}
      {notes.length > 0 && (
        <Section title="Session Notes">
          <ul className="space-y-1 text-sm">
            {notes.slice(0, 5).map((note, i) => (
              <li key={i} className="text-neutral-300">• {note}</li>
            ))}
            {notes.length > 5 && (
              <li className="text-neutral-500">...and {notes.length - 5} more</li>
            )}
          </ul>
        </Section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="p-4 bg-neutral-800 rounded-lg text-center">
      <div className="text-neutral-400 mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
  );
}
