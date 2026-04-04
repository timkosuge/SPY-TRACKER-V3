// functions/music.js
// GET  /music?action=playlist          → current playlist + now playing
// POST /music { action:'admin', password, cmd, ... } → admin controls
//
// The playlist is stored in a KV namespace called MUSIC_KV.
// Bind it in Cloudflare Pages → Settings → Functions → KV bindings:
//   Variable name: MUSIC_KV
//
// Songs are served as static assets from /music/*.mp3 in your repo.
// The KV just stores the playlist order and admin state.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (d, s = 200) => new Response(JSON.stringify(d), {
  status: s,
  headers: { 'Content-Type': 'application/json', ...CORS }
});

// Default playlist — filenames relative to /music/
// Edit this list to match your actual MP3 filenames
const DEFAULT_SONGS = [
  { id: 'song1', file: 'song1.mp3', title: 'Track 1' },
  { id: 'song2', file: 'song2.mp3', title: 'Track 2' },
];

async function getPlaylist(kv) {
  if (!kv) return { playlist: DEFAULT_SONGS, autoplay: true };
  try {
    const raw = await kv.get('playlist');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { playlist: DEFAULT_SONGS, autoplay: true };
}

async function savePlaylist(kv, data) {
  if (!kv) return;
  await kv.put('playlist', JSON.stringify(data));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet(context) {
  const { env } = context;
  const data = await getPlaylist(env.MUSIC_KV);
  return json(data);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const MUSIC_PASSWORD = env.MUSIC_PASSWORD || env.BLOG_PASSWORD || 'Tetsuo314!';

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  if (body.action !== 'admin') return json({ error: 'Unknown action' }, 400);
  if (body.password !== MUSIC_PASSWORD) return json({ error: 'Wrong password' }, 403);

  const data = await getPlaylist(env.MUSIC_KV);

  // cmd: 'set_playlist' — replace entire playlist
  if (body.cmd === 'set_playlist') {
    data.playlist = body.playlist || [];
    await savePlaylist(env.MUSIC_KV, data);
    return json({ ok: true, playlist: data.playlist });
  }

  // cmd: 'add_song' — append a song
  if (body.cmd === 'add_song') {
    const song = body.song;
    if (!song?.file || !song?.title) return json({ error: 'song.file and song.title required' }, 400);
    song.id = song.id || song.file.replace(/[^a-zA-Z0-9]/g, '_');
    data.playlist.push(song);
    await savePlaylist(env.MUSIC_KV, data);
    return json({ ok: true, playlist: data.playlist });
  }

  // cmd: 'remove_song' — remove by id
  if (body.cmd === 'remove_song') {
    data.playlist = data.playlist.filter(s => s.id !== body.id);
    await savePlaylist(env.MUSIC_KV, data);
    return json({ ok: true, playlist: data.playlist });
  }

  // cmd: 'reorder' — set new order by id array
  if (body.cmd === 'reorder') {
    const order = body.order || [];
    data.playlist = order.map(id => data.playlist.find(s => s.id === id)).filter(Boolean);
    await savePlaylist(env.MUSIC_KV, data);
    return json({ ok: true, playlist: data.playlist });
  }

  // cmd: 'set_autoplay'
  if (body.cmd === 'set_autoplay') {
    data.autoplay = !!body.autoplay;
    await savePlaylist(env.MUSIC_KV, data);
    return json({ ok: true, autoplay: data.autoplay });
  }

  return json({ error: 'Unknown cmd' }, 400);
}
