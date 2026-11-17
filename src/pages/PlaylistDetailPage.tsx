import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit2,
  Play,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext.tsx';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { computeTotalDuration, formatDuration } from '../utils/playerLogic.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';

export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    playlists,
    renamePlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    recordPlay,
  } = useLibrary();
  const { playTrack, shuffle, toggleShuffle } = usePlayerStore();

  const playlist = playlists.find((p) => p.id === id);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(playlist?.name || '');

  if (!playlist) {
    return (
      <div className="rounded-2xl bg-[#181818] p-10 text-center">
        <p className="text-sm text-[#B3B3B3]">Playlist not found.</p>
      </div>
    );
  }

  const totalSec = computeTotalDuration(playlist.tracks);

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    await renamePlaylist(playlist.id, nameInput.trim());
    setEditing(false);
  };

  const handleDelete = async () => {
    await deletePlaylist(playlist.id);
    navigate('/playlists');
  };

  const handlePlayAll = async (withShuffle = false) => {
    if (playlist.tracks.length === 0) return;
    if (withShuffle && !shuffle) toggleShuffle();
    const first = withShuffle
      ? playlist.tracks[Math.floor(Math.random() * playlist.tracks.length)]
      : playlist.tracks[0];
    await playTrack(first, playlist.tracks);
    void recordPlay(first);
  };

  return (
    <div className="space-y-6">
      {/* Spotify Gradient Playlist Header */}
      <section className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-6 px-4 pt-6 pb-6 sm:px-6 lg:px-8 bg-gradient-to-b from-[#2A2A2A] via-[#1B1B1B] to-[#121212] flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <ArtworkImage
          src={playlist.artworkUrl || playlist.tracks[0]?.artworkUrl}
          alt={playlist.name}
          className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
        />

        <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80">
            Playlist
          </p>

          {editing ? (
            <form
              onSubmit={handleSaveRename}
              className="flex gap-2.5 max-w-md mx-auto sm:mx-0"
            >
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                aria-label="Edit playlist name"
                className="flex-1 rounded-lg bg-[#242424] border border-[#1ED760] px-3.5 py-2 text-lg font-bold text-white focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Save playlist name"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1ED760] px-5 py-2 text-xs font-bold text-black"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </form>
          ) : (
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              {playlist.name}
            </h1>
          )}

          {playlist.description && (
            <p className="text-sm text-[#B3B3B3]">{playlist.description}</p>
          )}
          <p className="text-xs font-mono-tabular text-[#B3B3B3]">
            {playlist.tracks.length} tracks · {formatDuration(totalSec)}
          </p>

          {/* Spotify Action Bar */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              type="button"
              disabled={playlist.tracks.length === 0}
              onClick={() => void handlePlayAll(false)}
              aria-label="Play all tracks"
              className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1ED760] text-black hover:bg-[#1FDF64] hover:scale-105 active:scale-95 disabled:opacity-40 transition-all shadow-xl"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>
            <button
              type="button"
              disabled={playlist.tracks.length === 0}
              onClick={() => void handlePlayAll(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#242424] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#303030] disabled:opacity-40 min-h-[40px]"
            >
              <Shuffle className="w-4 h-4 text-[#1ED760]" />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNameInput(playlist.name);
                setEditing(!editing);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#242424] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#303030] min-h-[40px]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#242424] px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
        {playlist.tracks.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#B3B3B3]">
            This playlist is empty. Click the playlist icon on any track to add it here.
          </div>
        ) : (
          playlist.tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              queueContext={playlist.tracks}
              extraAction={
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() =>
                      void reorderPlaylistTracks(playlist.id, idx, idx - 1)
                    }
                    aria-label={`Move ${track.title} up`}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#B3B3B3] hover:text-white disabled:opacity-20 rounded-full"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === playlist.tracks.length - 1}
                    onClick={() =>
                      void reorderPlaylistTracks(playlist.id, idx, idx + 1)
                    }
                    aria-label={`Move ${track.title} down`}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#B3B3B3] hover:text-white disabled:opacity-20 rounded-full"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void removeTrackFromPlaylist(playlist.id, track.id)
                    }
                    aria-label={`Remove ${track.title} from playlist`}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#B3B3B3] hover:text-rose-400 rounded-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              }
            />
          ))
        )}
      </section>
    </div>
  );
};
