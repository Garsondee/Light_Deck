import { Monitor, Play } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { cn } from '../../utils/cn';

/**
 * A small preview window showing what players are currently seeing.
 * Displays the active scene's background image as a thumbnail.
 */
export function PlayerViewPreview() {
  const { activeScene, isViewingActiveScene } = useSceneStore();

  // Build image path - prefer imageUrl from API, fallback to constructing from image field
  // Images are proxied through Vite to the main server at port 3000
  const imagePath = activeScene?.imageUrl
    ? activeScene.imageUrl
    : activeScene?.image
      ? `/assets/scene_backgrounds/${activeScene.image}`
      : null;

  const isViewing = isViewingActiveScene();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="section-header flex items-center gap-2">
          <Monitor size={14} />
          Player View
        </h3>
        {isViewing && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Play size={10} /> LIVE
          </span>
        )}
      </div>

      {/* Preview container */}
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden',
          'border-2',
          isViewing ? 'border-green-500/50' : 'border-amber-500/50',
          'bg-neutral-800'
        )}
      >
        {imagePath ? (
          <img
            src={imagePath}
            alt={activeScene?.title || 'Scene preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <Monitor size={24} className="mx-auto mb-1 opacity-50" />
              <span className="text-xs">No image</span>
            </div>
          </div>
        )}

        {/* Scene title overlay */}
        {activeScene && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-xs text-white truncate font-medium">
              {activeScene.title}
            </p>
            <p className="text-[10px] text-neutral-400 truncate">
              {activeScene.location}
            </p>
          </div>
        )}

        {/* Live indicator pulse */}
        {isViewing && (
          <div className="absolute top-2 right-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Scene info */}
      {activeScene && !isViewing && (
        <p className="text-xs text-amber-400/80 text-center">
          Players see different scene
        </p>
      )}
    </div>
  );
}
