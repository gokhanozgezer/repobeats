<p align="center">
<img width="400" height="259" alt="repobeats" src="https://github.com/user-attachments/assets/fb001e39-21a3-458b-8402-61114bb6d47d" />
</p>

# RepoBeats

> Transform your git commits into music

RepoBeats analyzes your repository's commit history and generates unique musical compositions based on commit patterns, authors, timestamps, and code changes.

## Quick Start

```bash
# Run in any git repository
npx repobeats ui
```

## Installation

```bash
# Install globally
npm install -g repobeats

# Or use directly with npx
npx repobeats ui
```

## Commands

### `repobeats ui`

Start the interactive UI in your browser.

```bash
repobeats ui [path] [options]

Options:
  -p, --port <number>     Custom port (default: auto-detect)
  --host <address>        Host to bind (default: 127.0.0.1)
  --no-open               Don't open browser automatically
  --since <date>          Start from this date/commit
  --until <date>          End at this date/commit
  --max-commits <n>       Limit number of commits (default: 1000)
  --no-cache              Disable commit caching
```

### `repobeats export`

Export your repository as MIDI, WAV, JSON, or a full bundle.

```bash
repobeats export [path] [options]

Options:
  -f, --format <type>     Output format: midi, wav, json, bundle (default: bundle)
  -o, --out <path>        Output file path
  --preset <name>         Use a preset: default, chill, intense, minimal, ambient
  --instruments <list>    Instruments for WAV: guitar,piano,drums,strings (comma-separated)
  --since <date>          Start from this date/commit
  --until <date>          End at this date/commit
  --max-commits <n>       Limit commits
  --anonymize             Remove author/message data
```

### `repobeats inspect`

View repository statistics and mapping preview.

```bash
repobeats inspect [path] [options]

Options:
  --since <date>          Start from this date/commit
  --until <date>          End at this date/commit
  --max-commits <n>       Limit commits
  --json                  Output as JSON
```

## Presets

| Preset | BPM | Scale | Character |
|--------|-----|-------|-----------|
| `default` | 120 | Pentatonic | Balanced, melodic |
| `chill` | 70 | Major | Slow, soft, relaxing |
| `intense` | 160 | Minor | Fast, aggressive |
| `minimal` | 90 | Pentatonic | Clean, repetitive |
| `ambient` | 60 | Dorian | Atmospheric, spacey |

## How It Works

RepoBeats maps commit metadata to musical parameters:

| Parameter | Sources |
|-----------|---------|
| **Pitch** | Commit SHA, author name, hour of day, day of week |
| **Velocity** | Lines added/deleted, files changed, message length |
| **Duration** | Diff size, file count, message length |
| **Tempo** | Fixed BPM or commit frequency |

## UI Features

- **Dashboard**: Repository overview, commit heatmap, author stats
- **Mapping**: Customize how commits become notes
- **Playback**: Listen to your repo with real-time visualization
- **Export**: Download WAV, MIDI, JSON, or bundled archives

## Examples

```bash
# Open current directory
repobeats ui

# Open specific repository
repobeats ui ~/projects/my-app

# Export last 100 commits as MIDI with chill preset
repobeats export --max-commits 100 --preset chill --format midi

# Export as WAV with piano and strings only
repobeats export --format wav --instruments piano,strings --preset ambient

# Export as WAV with all instruments
repobeats export --format wav --preset default

# Inspect with JSON output
repobeats inspect --json > stats.json

# Export anonymized bundle
repobeats export --anonymize --out my-project.zip
```
<p align="center">
<img width="953" height="708" alt="repobeats_Studio" src="https://github.com/user-attachments/assets/2048a021-15eb-4b3d-acf1-f06c7010c934" />
</p>

## Requirements

- Node.js 18+
- Git repository with at least one commit

## License

Proprietary - See [LICENSE](LICENSE) for details.

You may use this software for personal and educational purposes. Redistribution is not permitted.
