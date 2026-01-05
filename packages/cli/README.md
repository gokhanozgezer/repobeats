# RepoBeats

Transform your git commits into music.

RepoBeats analyzes your repository's commit history and generates unique musical compositions based on commit patterns, authors, timestamps, and code changes.

## Installation

```bash
# Run directly with npx (no install needed)
npx repobeats ui

# Or install globally
npm install -g repobeats
```

## Usage

### Start the UI

```bash
# In any git repository
cd your-project
repobeats ui

# Or specify a path
repobeats ui /path/to/repo

# Options
repobeats ui --port 3000        # Custom port
repobeats ui --no-open          # Don't open browser
repobeats ui --max-commits 500  # Limit commits
```

### Export MIDI directly

```bash
# Export as MIDI file
repobeats export --format midi

# Export full bundle (MIDI + data + config)
repobeats export --format bundle

# Use a preset
repobeats export --preset chill --out my-repo.mid

# Anonymize data
repobeats export --anonymize
```

### Inspect repository

```bash
# View commit statistics
repobeats inspect

# Output as JSON
repobeats inspect --json
```

## Mapping Presets

| Preset | Description |
|--------|-------------|
| `default` | Balanced, pentatonic scale, 120 BPM |
| `chill` | Slow, major scale, soft dynamics |
| `intense` | Fast, minor scale, high velocity |
| `minimal` | Fixed duration/velocity, clean |
| `ambient` | Slow, dorian mode, atmospheric |

## How It Works

RepoBeats maps commit data to musical parameters:

- **Pitch**: Based on commit SHA, author name, or time of day
- **Velocity**: Based on lines added/deleted or file count
- **Duration**: Based on diff size or message length
- **Tempo**: Fixed BPM or derived from commit frequency

## Requirements

- Node.js 18+
- Git repository

## License

Proprietary - See [LICENSE](LICENSE) for details.

You may use this software for personal and educational purposes. Redistribution is not permitted.
