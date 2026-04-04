# Music Folder

Drop your MP3 files here. Files are served as static assets at `/music/filename.mp3`.

After adding files, update the playlist via the ⚙ admin panel on the dashboard,
or edit the `DEFAULT_SONGS` array in `functions/music.js` to set the default playlist.

## Setup Required in Cloudflare Pages

1. **Bind a KV namespace** called `MUSIC_KV` in:
   Pages → your project → Settings → Functions → KV namespace bindings

2. **Set `MUSIC_PASSWORD`** in environment variables (or it falls back to `BLOG_PASSWORD`)

3. **Admin access**: click ⚙ in the player bar, enter your password once per session.
   The gear icon only appears after you authenticate — visitors only see vol/mute/nav.

## Your song path
`C:\Users\Tetsu\OneDrive\SPY TRACKER\MUSIC\SITE PLAYLIST\`

Copy MP3s from there into this folder and commit + push to GitHub.
