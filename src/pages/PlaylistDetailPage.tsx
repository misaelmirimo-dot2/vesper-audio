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
      <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center">
        <p className="text-sm text-[#9494A3]">Playlist not found.</p>
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
      <section className="flex flex-col sm:flex-row gap-6 rounded-2xl border border-[#22222E] bg-[#15151B] p-6 sm:p-8">
        <ArtworkImage
          src={playlist.artworkUrl || playlist.tracks[0]?.artworkUrl}
          alt={playlist.name}
          className="w-40 h-40 rounded-xl mx-auto sm:mx-0"
        />

        <div className="flex-1 space-y-3">
          <p className="text-xs font-medium text-violet-400">Playlist</p>

          {editing ? (
            <form onSubmit={handleSaveRename} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                aria-label="Edit playlist name"
                className="flex-1 rounded-lg border border-violet-500 bg-[#0E0E12] px-3 py-1.5 text-lg font-bold text-[#F5F5F7] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Save playlist name"
                className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </form>
          ) : (
            <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">
              {playlist.name}
            </h1>
          )}

          {playlist.description && (
            <p className="text-sm text-[#9494A3]">{playlist.description}</p>
          )}
          <p className="text-xs font-mono-tabular text-[#78788A]">
            {playlist.tracks.length} tracks · {formatDuration(totalSec)} total
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={playlist.tracks.length === 0}
              onClick={() => void handlePlayAll(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              disabled={playlist.tracks.length === 0}
              onClick={() => void handlePlayAll(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A38] bg-[#1A1A22] px-4 py-2 text-xs font-medium text-[#F5F5F7] disabled:opacity-40"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNameInput(playlist.name);
                setEditing(!editing);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A38] px-3 py-2 text-xs text-[#9494A3] hover:text-white"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
        {playlist.tracks.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#9494A3]">
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
                    className="p-1.5 text-[#9494A3] hover:text-white disabled:opacity-25"
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
                    className="p-1.5 text-[#9494A3] hover:text-white disabled:opacity-25"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void removeTrackFromPlaylist(playlist.id, track.id)
                    }
                    aria-label={`Remove ${track.title} from playlist`}
                    className="p-1.5 text-[#9494A3] hover:text-rose-400"
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
