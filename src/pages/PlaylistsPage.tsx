import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ListMusic, Plus } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext.tsx';
import { computeTotalDuration, formatDuration } from '../utils/playerLogic.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Playlist name is required')
    .max(60, 'Max 60 characters'),
  description: z.string().trim().max(180).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export const PlaylistsPage: React.FC = () => {
  const { playlists, createPlaylist } = useLibrary();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const onSubmit = async (values: CreateForm) => {
    await createPlaylist(values.name, values.description || '');
    reset();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Playlists
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          Organize tracks into personal collections synced offline and in PostgreSQL.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-6 space-y-4 max-w-2xl"
      >
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Create New Playlist
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="playlist-name"
              className="block text-xs text-[var(--text-secondary)] mb-1.5"
            >
              Playlist Name
            </label>
            <input
              id="playlist-name"
              type="text"
              placeholder="e.g. Late Night Focus"
              {...register('name')}
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[#fa233b] focus:outline-none"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="playlist-desc"
              className="block text-xs text-[var(--text-secondary)] mb-1.5"
            >
              Description (optional)
            </label>
            <input
              id="playlist-desc"
              type="text"
              placeholder="Ambient & instrumental cuts"
              {...register('description')}
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[#fa233b] focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#fa233b] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#e01e33] transition-transform hover:scale-105 shadow-md shadow-[#fa233b]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </form>

      {playlists.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-10 text-center space-y-3">
          <ListMusic className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No playlists created yet
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Create a playlist above, then add songs from Discover or Search.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((pl) => {
            const totalSec = computeTotalDuration(pl.tracks);
            return (
              <Link
                key={pl.id}
                to={`/playlists/${pl.id}`}
                className="flex items-center gap-4 rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-4 hover:border-[#fa233b]/40 transition-all hover-glass-lift"
              >
                <ArtworkImage
                  src={pl.artworkUrl || pl.tracks[0]?.artworkUrl}
                  alt={pl.name}
                  className="w-20 h-20 rounded-xl shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                    {pl.name}
                  </p>
                  {pl.description && (
                    <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                      {pl.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-mono-tabular text-[var(--text-secondary)]">
                    {pl.tracks.length} tracks · {formatDuration(totalSec)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
