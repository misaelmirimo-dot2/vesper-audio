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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-playlist-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#262632] bg-[#15151B] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="add-to-playlist-title"
              className="text-base font-semibold text-[#F5F5F7]"
            >
              Add to Playlist
            </h3>
            <p className="mt-1 text-xs text-[#9494A3] truncate max-w-xs">
              {track.title} · {track.artistName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add to playlist modal"
            className="p-2 text-[#9494A3] hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {playlists.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#9494A3]">
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
                  className="flex w-full items-center justify-between rounded-lg border border-[#262632] bg-[#1A1A22] px-3.5 py-2.5 text-left text-sm transition-colors hover:border-violet-500/40 disabled:opacity-70"
                >
                  <span className="truncate font-medium text-[#F5F5F7]">
                    {pl.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#9494A3] shrink-0">
                    {alreadyIn ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-violet-400" />
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
          className="mt-5 border-t border-[#262632] pt-4"
        >
          <label
            htmlFor="new-playlist-inline"
            className="block text-xs font-medium text-[#9494A3]"
          >
            Create new playlist
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="new-playlist-inline"
              type="text"
              placeholder="e.g. Late Night Focus"
              {...register('name')}
              className="flex-1 rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3 py-2 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
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
