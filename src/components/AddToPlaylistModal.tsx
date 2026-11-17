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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-playlist-title"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#242424] border border-white/10 p-6 shadow-2xl pb-safe">
        <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3
              id="add-to-playlist-title"
              className="text-base font-bold text-white"
            >
              Add to Playlist
            </h3>
            <p className="mt-1 text-xs text-[#B3B3B3] truncate max-w-xs">
              {track.title} · {track.artistName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add to playlist modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#B3B3B3] hover:text-white rounded-full shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
          {playlists.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#B3B3B3]">
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
                  className="flex w-full items-center justify-between rounded-xl bg-[#181818] px-4 py-3 text-left text-sm transition-colors hover:bg-[#2E2E2E] disabled:opacity-70 min-h-[48px]"
                >
                  <span className="truncate font-semibold text-white">
                    {pl.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#B3B3B3] shrink-0">
                    {alreadyIn ? (
                      <>
                        <Check className="w-4 h-4 text-[#1ED760]" />
                        <span className="text-[#1ED760] font-semibold">Added</span>
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-4 h-4" />
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
          className="mt-5 border-t border-white/10 pt-4"
        >
          <label
            htmlFor="new-playlist-inline"
            className="block text-xs font-semibold text-[#B3B3B3]"
          >
            Create new playlist
          </label>
          <div className="mt-2 flex gap-2.5">
            <input
              id="new-playlist-inline"
              type="text"
              placeholder="e.g. Late Night Focus"
              {...register('name')}
              className="flex-1 rounded-lg bg-[#121212] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-[#727272] focus:border-[#1ED760] focus:outline-none min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>
          {errors.name && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>
          )}
        </form>
      </div>
    </div>
  );
};
