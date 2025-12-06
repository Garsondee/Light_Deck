import { useState, useRef } from 'react';
import { Image, Upload, Trash2, RefreshCw } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { cn } from '../../utils/cn';

/**
 * Compact manager for the current scene's background image.
 * Designed to sit just under the scene title as a small thumbnail
 * with replace/remove controls.
 */
export function SceneImageManager() {
  const { currentScene, updateSceneImage } = useSceneStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentScene) {
    return null;
  }

  // Build image path for preview
  const imagePath = currentScene.imageUrl
    ? currentScene.imageUrl
    : currentScene.image
      ? `/assets/scene_backgrounds/${currentScene.image}`
      : null;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentScene) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/scenes/${currentScene.id}/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const result = await response.json();
      
      // Update local store
      updateSceneImage(currentScene.id, result.image, result.imageUrl);
      
      console.log('[SceneImageManager] Image uploaded:', result);
    } catch (err) {
      console.error('[SceneImageManager] Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!currentScene || !currentScene.image) return;

    if (!confirm('Remove the background image from this scene?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scenes/${currentScene.id}/image`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove image');
      }

      // Update local store
      updateSceneImage(currentScene.id, null, null);
      
      console.log('[SceneImageManager] Image removed');
    } catch (err) {
      console.error('[SceneImageManager] Remove error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="text-xs">
      {/* Thumbnail */}
      <div
        className={cn(
          'relative h-36 w-full rounded-md overflow-hidden',
          'border border-neutral-700',
          'bg-neutral-800'
        )}
      >
        {imagePath ? (
          <img
            src={imagePath}
            alt={currentScene.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <Image size={20} className="mx-auto mb-1 opacity-50" />
              <span className="text-[11px]">No image</span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <RefreshCw size={18} className="animate-spin text-cyan-400" />
          </div>
        )}
      </div>

      {/* Controls + labels */}
      <div className="mt-2 space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Image size={10} />
            Scene Image
          </span>
          {currentScene.image && (
            <span className="text-[10px] text-neutral-500 truncate max-w-[10rem]" title={currentScene.image}>
              {currentScene.image}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleFileSelect}
            disabled={uploading}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1.5',
              'bg-cyan-700 hover:bg-cyan-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Upload size={11} />
            {currentScene.image ? 'Replace' : 'Upload'}
          </button>

          {currentScene.image && (
            <button
              onClick={handleRemoveImage}
              disabled={uploading}
              className={cn(
                'px-3 py-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1.5',
                'bg-red-700 hover:bg-red-600 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Remove image"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Error / help text */}
        {error ? (
          <p className="text-[10px] text-red-400 truncate">{error}</p>
        ) : (
          <p className="text-[10px] text-neutral-500 truncate">
            Auto-named from scene id.
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
