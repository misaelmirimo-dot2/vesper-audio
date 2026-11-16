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
      <div className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-10 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Playlist not found.</p>
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
    <div className="space-y-6 animate-fade-in">
      <section className="flex flex-col sm:flex-row gap-6 rounded-3xl border border-[var(--border-hairline)] liquid-glass p-6 sm:p-8 shadow-xl">
        <ArtworkImage
          src={playlist.artworkUrl || playlist.tracks[0]?.artworkUrl}
          alt={playlist.name}
          className="w-40 h-40 rounded-2xl mx-auto sm:mx-0 shadow-lg"
        />

        <div className="flex-1 space-y-3">
          <p className="text-xs font-semibold text-[#fa233b]">Playlist</p>

          {editing ? (
            <form onSubmit={handleSaveRename} className="flex gap-2.5 max-w-md">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                aria-label="Edit playlist name"
                className="flex-1 rounded-xl border border-[#fa233b] bg-[var(--bg-elevated)] px-3.5 py-2 text-lg font-bold text-[var(--text-primary)] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Save playlist name"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#fa233b] px-4 py-2 text-xs font-medium text-white shadow-md shadow-[#fa233b]/20"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </form>
          ) : (
            <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
              {playlist.name}
            </h1>
          )}

          {playlist.description && (
            <p className="text-sm text-[var(--text-secondary)]">{playlist.description}</p>
          )}
          <p className="text-xs font-mono-tabular text-[var(--text-secondary)]">
            {playlist.tracks.length} tracks · {formatDuration(totalSec)} total
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={playlist.tracks.length === 0}
              onClick={() => void handlePlayAll(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#fa233b] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#e01e33] disabled:opacity-40 transition-transform hover:scale-105 shadow-md shadow-[#fa233b]/25"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              disabled={playlist.tracks.length === 0}
              onClick={() => void handlePlayAll(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] disabled:opacity-40 transition-colors"
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-3.5 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-2">
        {playlist.tracks.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
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
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() =>
                      void reorderPlaylistTracks(playlist.id, idx, idx - 1)
                    }
                    aria-label={`Move ${track.title} up`}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 rounded-lg"
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
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 rounded-lg"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void removeTrackFromPlaylist(playlist.id, track.id)
                    }
                    aria-label={`Remove ${track.title} from playlist`}
                    className="p-2 text-[var(--text-secondary)] hover:text-rose-500 rounded-lg"
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
