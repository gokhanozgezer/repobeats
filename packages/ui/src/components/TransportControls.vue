<script setup lang="ts">
defineProps<{
  playing: boolean
  paused: boolean
  progress: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  play: []
  pause: []
  stop: []
}>()
</script>

<template>
  <div class="transport">
    <div class="controls">
      <button
        class="control-btn stop-btn"
        @click="emit('stop')"
        :disabled="!playing && !paused"
        title="Stop"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      </button>

      <button
        v-if="!playing"
        class="control-btn play-btn"
        @click="emit('play')"
        :disabled="disabled"
        title="Play"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <button
        v-else
        class="control-btn pause-btn"
        @click="emit('pause')"
        title="Pause"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      </button>
    </div>

    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>
      <span class="progress-text">{{ Math.round(progress) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.transport {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn svg {
  width: 24px;
  height: 24px;
}

.play-btn {
  width: 64px;
  height: 64px;
  background: var(--accent);
  color: white;
}

.play-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.play-btn svg {
  width: 32px;
  height: 32px;
  margin-left: 4px;
}

.pause-btn {
  width: 64px;
  height: 64px;
  background: var(--warning);
  color: white;
}

.pause-btn:hover {
  filter: brightness(1.1);
  transform: scale(1.05);
}

.pause-btn svg {
  width: 28px;
  height: 28px;
}

.stop-btn {
  width: 48px;
  height: 48px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.stop-btn:hover:not(:disabled) {
  background: var(--border);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  width: 40px;
  text-align: right;
}
</style>
