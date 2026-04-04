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
  { id: '11th_hour', file: 'SITE PLAYLIST 11th Hour.mp3', title: '11th Hour' },
  { id: 'all_in', file: 'SITE PLAYLIST All In.mp3', title: 'All In' },
  { id: 'all_those_times', file: 'SITE PLAYLIST All Those Times Reminisce.mp3', title: 'All Those Times Reminisce' },
  { id: 'ballin', file: 'SITE PLAYLIST Ballin.mp3', title: 'Ballin' },
  { id: 'burn_fast', file: 'SITE PLAYLIST Burn Fast.mp3', title: 'Burn Fast' },
  { id: 'cant_give_up', file: 'SITE PLAYLIST Can\'t Give Up.mp3', title: 'Can\'t Give Up' },
  { id: 'default_aggressive', file: 'SITE PLAYLIST DEFAULT AGGRESSIVE.mp3', title: 'Default Aggressive' },
  { id: 'decades_in_weeks', file: 'SITE PLAYLIST Decades in Weeks.mp3', title: 'Decades in Weeks' },
  { id: 'discipline_freedom', file: 'SITE PLAYLIST Discipline Equals FREEDOM.mp3', title: 'Discipline Equals Freedom' },
  { id: 'do_what_others_dont', file: 'SITE PLAYLIST Do What Others Don\'t.mp3', title: 'Do What Others Don\'t' },
  { id: 'every_second_counts', file: 'SITE PLAYLIST EVERY SECOND COUNTS.mp3', title: 'Every Second Counts' },
  { id: 'float_on', file: 'SITE PLAYLIST Float On.mp3', title: 'Float On' },
  { id: 'forward_momentum', file: 'SITE PLAYLIST Forward Momentum.mp3', title: 'Forward Momentum' },
  { id: 'high_you_are', file: 'SITE PLAYLIST High You Are.mp3', title: 'High You Are' },
  { id: 'i_feel_fine', file: 'SITE PLAYLIST I FEEL FINE.mp3', title: 'I Feel Fine' },
  { id: 'i_wake_up_early', file: 'SITE PLAYLIST I Wake Up Early.mp3', title: 'I Wake Up Early' },
  { id: 'im_a_dude', file: 'SITE PLAYLIST I\'m a Dude.mp3', title: 'I\'m a Dude' },
  { id: 'mistakes_of_youth', file: 'SITE PLAYLIST Mistakes Of My Youth.mp3', title: 'Mistakes Of My Youth' },
  { id: 'modern_man', file: 'SITE PLAYLIST Modern Man Intermission.mp3', title: 'Modern Man Intermission' },
  { id: 'note_to_self', file: 'SITE PLAYLIST Note To Self.mp3', title: 'Note To Self' },
  { id: 'ongoing_thing', file: 'SITE PLAYLIST Ongoing Thing.mp3', title: 'Ongoing Thing' },
  { id: 'only_the_poets', file: 'SITE PLAYLIST Only the Poets.mp3', title: 'Only the Poets' },
  { id: 'right_where_it', file: 'SITE PLAYLIST Right Where It Belongs.mp3', title: 'Right Where It Belongs' },
  { id: 'roller_coasters', file: 'SITE PLAYLIST Roller Coasters.mp3', title: 'Roller Coasters' },
  { id: 'sink_or_swim', file: 'SITE PLAYLIST Sink or Swim.mp3', title: 'Sink or Swim' },
  { id: 'the_way_she_moves', file: 'SITE PLAYLIST The Way She Moves.mp3', title: 'The Way She Moves' },
  { id: 'time', file: 'SITE PLAYLIST Time.mp3', title: 'Time' },
  { id: 'to_the_moon', file: 'SITE PLAYLIST To The Moon.mp3', title: 'To The Moon' },
  { id: 'unwind', file: 'SITE PLAYLIST Unwind.mp3', title: 'Unwind' },
  { id: 'what_are_you_doing', file: 'SITE PLAYLIST WHAT ARE YOU GOING TO DO.mp3', title: 'What Are You Going To Do' },
  { id: 'world_on_fire', file: 'SITE PLAYLIST World On Fire.mp3', title: 'World On Fire' },
  { id: 'you_should_be', file: 'SITE PLAYLIST You Should Be A Monster.mp3', title: 'You Should Be A Monster' },
  { id: 'right_bet', file: 'SITE PLAYLIST right bet.mp3', title: 'Right Bet' },
  { id: 'longest_road', file: 'SITE PLAYLIST longest road.mp3', title: 'Longest Road' },
  { id: 'shoulda_coulda', file: 'SITE PLAYLIST shoulda coulda woulda.mp3', title: 'Shoulda Coulda Woulda' },
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
