import React, { useState } from 'react';
import { Check, ListPlus, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NormalizedTrack } from '../types/music.ts';
import { useLibrary } from '../context/LibraryContext.tsx';

const playlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Playlist name is required')
    .max(60, 'Max 60 characters'),
});

type PlaylistFormValues = z.infer<typeof playlistSchema>;

interface AddToPlaylistModalProps {
  track: NormalizedTrack | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  track,
  onClose,
}) => {
  const { playlists, addTrackToPlaylist, createPlaylist } = useLibrary();
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
  });

  if (!track) return null;

  const handleAdd = async (playlistId: string) => {
    await addTrackToPlaylist(playlistId, track);
    setAddedIds((prev) => [...prev, playlistId]);
  };

  const onCreateAndAdd = async (values: PlaylistFormValues) => {
    const created = await createPlaylist(values.name);
    await addTrackToPlaylist(created.id, track);
    setAddedIds((prev) => [...prev, created.id]);
    reset();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-playlist-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-hairline)] liquid-glass p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="add-to-playlist-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              Add to Playlist
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)] truncate max-w-xs">
              {track.title} · {track.artistName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add to playlist modal"
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 max-h-56 space-y-2 overflow-y-auto pr-1">
          {playlists.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
              No playlists yet. Create your first playlist below.
            </p>
          ) : (
            playlists.map((pl) => {
              const alreadyIn =
                pl.tracks.some((t) => t.id === track.id) ||
                addedIds.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  disabled={alreadyIn}
                  onClick={() => void handleAdd(pl.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-3 text-left text-sm transition-all hover:border-[#fa233b]/40 disabled:opacity-70"
                >
                  <span className="truncate font-medium text-[var(--text-primary)]">
                    {pl.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] shrink-0">
                    {alreadyIn ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#fa233b]" />
                        Added
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-3.5 h-3.5" />
                        {pl.tracks.length} tracks
                      </>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSubmit(onCreateAndAdd)}
          className="mt-5 border-t border-[var(--border-hairline)] pt-4"
        >
          <label
            htmlFor="new-playlist-inline"
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            Create new playlist
          </label>
          <div className="mt-2 flex gap-2.5">
            <input
              id="new-playlist-inline"
              type="text"
              placeholder="e.g. Late Night Focus"
              {...register('name')}
              className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[#fa233b] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-[#fa233b] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#e01e33] transition-colors whitespace-nowrap shrink-0 shadow-md shadow-[#fa233b]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>
          {errors.name && (
            <p className="mt-1.5 text-xs text-rose-500">{errors.name.message}</p>
          )}
        </form>
      </div>
    </div>
  );
};
