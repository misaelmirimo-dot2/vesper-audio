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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
          Playlists
        </h1>
        <p className="mt-1 text-sm text-[#9494A3]">
          Organize tracks into personal collections synced offline and in PostgreSQL.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-[#22222E] bg-[#15151B] p-5 space-y-4 max-w-2xl"
      >
        <h2 className="text-sm font-semibold text-[#F5F5F7]">
          Create New Playlist
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="playlist-name"
              className="block text-xs text-[#9494A3] mb-1.5"
            >
              Playlist Name
            </label>
            <input
              id="playlist-name"
              type="text"
              placeholder="e.g. Late Night Focus"
              {...register('name')}
              className="w-full rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3.5 py-2 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-violet-500 focus:outline-none"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-400">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="playlist-desc"
              className="block text-xs text-[#9494A3] mb-1.5"
            >
              Description (optional)
            </label>
            <input
              id="playlist-desc"
              type="text"
              placeholder="Ambient & instrumental cuts"
              {...register('description')}
              className="w-full rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3.5 py-2 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </form>

      {playlists.length === 0 ? (
        <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-10 text-center space-y-2">
          <ListMusic className="w-7 h-7 text-[#666678] mx-auto" />
          <p className="text-sm font-medium text-[#F5F5F7]">
            No playlists created yet
          </p>
          <p className="text-xs text-[#9494A3]">
            Create a playlist above, then add songs from Discover or Search.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => {
            const totalSec = computeTotalDuration(pl.tracks);
            return (
              <Link
                key={pl.id}
                to={`/playlists/${pl.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#22222E] bg-[#15151B] p-4 hover:border-[#343446] transition-colors"
              >
                <ArtworkImage
                  src={pl.artworkUrl || pl.tracks[0]?.artworkUrl}
                  alt={pl.name}
                  className="w-20 h-20 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[#F5F5F7]">
                    {pl.name}
                  </p>
                  {pl.description && (
                    <p className="mt-0.5 truncate text-xs text-[#9494A3]">
                      {pl.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-mono-tabular text-[#78788A]">
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
