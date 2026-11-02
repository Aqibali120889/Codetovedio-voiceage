# AI Video Studio — Generated Output Directory

This directory stores all pipeline outputs.
It is excluded from Git (see `.gitignore`).

## Structure

```
data/
  .gitkeep                    ← keeps this dir in Git
  projects/
    <project-uuid>/
      input.json              ← original request
      script.json             ← validated script
      narration/
        scene_001.wav         ← per-scene audio
        scene_002.wav
        tts_results.json      ← TTS metadata
      subtitles/
        captions.srt
        captions.vtt
      manifest.json           ← Remotion render manifest
      render/
        final.mp4             ← rendered video
  renders/                    ← alternative flat render output
```
