<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CommitEvent } from '@repobeats/shared'

const props = defineProps<{
  commits: CommitEvent[]
}>()

const hoveredDay = ref<{ date: string; count: number; x: number; y: number } | null>(null)

const months = computed(() => {
  const result: { label: string; span: number }[] = []
  const today = new Date()
  let currentMonth = -1
  let span = 0

  for (let w = 25; w >= 0; w--) {
    const date = new Date(today)
    date.setDate(date.getDate() - w * 7)
    const month = date.getMonth()

    if (month !== currentMonth) {
      if (span > 0) {
        result.push({ label: getMonthLabel(currentMonth), span })
      }
      currentMonth = month
      span = 1
    } else {
      span++
    }
  }
  if (span > 0) {
    result.push({ label: getMonthLabel(currentMonth), span })
  }

  return result
})

function getMonthLabel(month: number): string {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return labels[month] ?? ''
}

const weeks = computed(() => {
  if (props.commits.length === 0) return []

  const commitsByDay = new Map<string, number>()

  for (const commit of props.commits) {
    const date = new Date(commit.timestamp)
    const key = date.toISOString().split('T')[0]
    commitsByDay.set(key, (commitsByDay.get(key) ?? 0) + 1)
  }

  const maxCount = Math.max(...commitsByDay.values(), 1)

  const today = new Date()
  const result: { date: string; count: number; level: number; dayName: string }[][] = []

  for (let w = 25; w >= 0; w--) {
    const week: { date: string; count: number; level: number; dayName: string }[] = []

    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (w * 7 + (6 - d)))
      const key = date.toISOString().split('T')[0]
      const count = commitsByDay.get(key) ?? 0
      const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      week.push({ date: key, count, level, dayName })
    }

    result.push(week)
  }

  return result
})

const totalCommits = computed(() => {
  return props.commits.length
})

const activeDays = computed(() => {
  const days = new Set<string>()
  for (const commit of props.commits) {
    const date = new Date(commit.timestamp)
    days.add(date.toISOString().split('T')[0])
  }
  return days.size
})

function handleMouseEnter(event: MouseEvent, day: { date: string; count: number }) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  hoveredDay.value = {
    date: day.date,
    count: day.count,
    x: rect.left + rect.width / 2,
    y: rect.top - 8
  }
}

function handleMouseLeave() {
  hoveredDay.value = null
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="timeline-container">
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">{{ totalCommits.toLocaleString() }}</span>
        <span class="stat-text">commits in the last 6 months</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ activeDays }}</span>
        <span class="stat-text">active days</span>
      </div>
    </div>

    <div class="heatmap">
      <div class="months-row">
        <div class="spacer"></div>
        <div class="months">
          <span
            v-for="(month, i) in months"
            :key="i"
            class="month-label"
            :style="{ gridColumn: `span ${month.span}` }"
          >
            {{ month.label }}
          </span>
        </div>
      </div>

      <div class="grid-container">
        <div class="days-label">
          <span></span>
          <span>Mon</span>
          <span></span>
          <span>Wed</span>
          <span></span>
          <span>Fri</span>
          <span></span>
        </div>

        <div class="grid">
          <div v-for="(week, wi) in weeks" :key="wi" class="week">
            <div
              v-for="(day, di) in week"
              :key="di"
              class="day"
              :class="[`level-${day.level}`, { 'has-commits': day.count > 0 }]"
              @mouseenter="handleMouseEnter($event, day)"
              @mouseleave="handleMouseLeave"
            />
          </div>
        </div>
      </div>

      <div class="legend">
        <span class="legend-label">Less</span>
        <div class="legend-items">
          <div class="legend-item level-0" />
          <div class="legend-item level-1" />
          <div class="legend-item level-2" />
          <div class="legend-item level-3" />
          <div class="legend-item level-4" />
        </div>
        <span class="legend-label">More</span>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="hoveredDay"
          class="tooltip"
          :style="{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }"
        >
          <strong>{{ hoveredDay.count }} commit{{ hoveredDay.count !== 1 ? 's' : '' }}</strong>
          <span>{{ formatDate(hoveredDay.date) }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-bar {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.heatmap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.months-row {
  display: flex;
}

.spacer {
  width: 36px;
  flex-shrink: 0;
}

.months {
  display: grid;
  grid-template-columns: repeat(26, 1fr);
  flex: 1;
  font-size: 11px;
  color: var(--text-secondary);
}

.month-label {
  text-align: left;
  padding-left: 4px;
}

.grid-container {
  display: flex;
}

.days-label {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  font-size: 11px;
  color: var(--text-secondary);
  width: 36px;
  flex-shrink: 0;
}

.days-label span {
  height: 14px;
  line-height: 14px;
}

.grid {
  display: flex;
  gap: 4px;
  flex: 1;
}

.week {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  transition: all 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

.day:hover {
  transform: scale(1.2);
  border-color: var(--text-secondary);
}

.day.level-0 {
  background: var(--bg-tertiary);
}

.day.level-1 {
  background: rgba(139, 92, 246, 0.2);
  box-shadow: 0 0 4px rgba(139, 92, 246, 0.1);
}

.day.level-2 {
  background: rgba(139, 92, 246, 0.4);
  box-shadow: 0 0 6px rgba(139, 92, 246, 0.15);
}

.day.level-3 {
  background: rgba(139, 92, 246, 0.65);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
}

.day.level-4 {
  background: linear-gradient(135deg, #10c1f6 0%, #5ef28c 100%);
  box-shadow: 0 0 12px rgba(16, 193, 246, 0.4);
}

.day.level-4:hover {
  box-shadow: 0 0 16px rgba(16, 193, 246, 0.6);
}

.legend {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.legend-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.legend-items {
  display: flex;
  gap: 3px;
}

.legend-item {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--bg-tertiary);
}

.legend-item.level-1 {
  background: rgba(139, 92, 246, 0.2);
}

.legend-item.level-2 {
  background: rgba(139, 92, 246, 0.4);
}

.legend-item.level-3 {
  background: rgba(139, 92, 246, 0.65);
}

.legend-item.level-4 {
  background: linear-gradient(135deg, #10c1f6 0%, #5ef28c 100%);
}

/* Tooltip */
.tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.tooltip strong {
  font-size: 13px;
  color: var(--text-primary);
}

.tooltip span {
  font-size: 11px;
  color: var(--text-secondary);
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--border);
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, -90%);
}

@media (max-width: 768px) {
  .stats-bar {
    flex-direction: column;
    gap: 8px;
  }

  .day {
    width: 10px;
    height: 10px;
  }

  .legend-item {
    width: 10px;
    height: 10px;
  }

  .grid {
    gap: 2px;
  }

  .week {
    gap: 2px;
  }
}
</style>
