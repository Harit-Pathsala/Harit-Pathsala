# Story narration audio

Place the 5 narration clips for each language here. The story player auto-loads them by
filename and plays each clip when its scene begins, revealing the subtitle words in time
with the voice. If a file is missing the story still plays (silent, timed subtitles).

## Required files (10 total)

public/narration/
  en/  part-1.mp3  part-2.mp3  part-3.mp3  part-4.mp3  part-5.mp3   ← English voice
  ne/  part-1.mp3  part-2.mp3  part-3.mp3  part-4.mp3  part-5.mp3   ← Nepali voice

- Format: MP3, mono, 44.1 kHz, ~128 kbps (small + universally supported).
- part-N maps to story scene N (1=pristine forest … 5=Bana's call to action).
- The player reads each clip's real length, so exact durations aren't critical — but the
  target lengths below give the best visual pacing.
