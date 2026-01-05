<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import { useRepoStore } from '@/stores/repo'

const route = useRoute()
const repoStore = useRepoStore()

// Theme
const isDark = ref(true)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('repobeats_theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('repobeats_theme')
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  repoStore.initialize()
})

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', requiresData: false },
  { path: '/studio', label: 'Studio', icon: 'studio', requiresData: true }
]

const isActive = (path: string) => computed(() => route.path === path)
const isDisabled = (item: typeof navItems[0]) => item.requiresData && !repoStore.isLoaded

function handleNavClick(e: Event, item: typeof navItems[0]) {
  if (isDisabled(item)) {
    e.preventDefault()
  }
}
</script>

<template>
  <div class="app">
    <!-- Loading Screen -->
    <div v-if="repoStore.loading && !repoStore.isLoaded" class="loading-screen">
      <div class="loading-content">
        <div class="loading-visual">
          <div class="wave-container">
            <div class="wave" v-for="i in 12" :key="i" :style="{ animationDelay: `${i * 0.1}s` }"></div>
          </div>
        </div>
        <h1 class="loading-title">RepoBeats</h1>
        <div class="loading-bar-container">
          <div class="loading-bar" :style="{ width: `${repoStore.loadingProgress}%` }"></div>
        </div>
        <p class="loading-message">{{ repoStore.loadingMessage }}</p>
        <p class="loading-percent">{{ repoStore.loadingProgress }}%</p>
      </div>
    </div>

    <!-- Error Screen -->
    <div v-else-if="repoStore.error" class="error-screen">
      <div class="error-content">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h1>Connection Error</h1>
        <p>{{ repoStore.error }}</p>
        <button class="btn btn-primary" @click="repoStore.refresh()">
          <span>Retry</span>
        </button>
      </div>
    </div>

    <!-- Main App -->
    <template v-else>
      <header class="header">
        <div class="container header-content">
          <div class="logo-section">
            <div class="logo">
              <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <span class="logo-text">RepoBeats</span>
            </div>
            <div v-if="repoStore.isLoaded && repoStore.summary" class="repo-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" class="repo-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <span class="repo-name">{{ repoStore.summary.name }}</span>
              <span class="repo-commits">{{ repoStore.commitCount }} commits</span>
            </div>
          </div>

          <nav class="nav">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="['nav-item', {
                active: isActive(item.path).value,
                disabled: isDisabled(item)
              }]"
              @click="handleNavClick($event, item)"
            >
              <span class="nav-label">{{ item.label }}</span>
            </RouterLink>
          </nav>

          <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Light mode' : 'Dark mode'">
            <svg v-if="isDark" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          </button>
        </div>
      </header>

      <main class="main">
        <div class="container">
          <RouterView />
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Loading Screen */
.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.loading-content {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.loading-visual {
  margin-bottom: 32px;
}

.wave-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 80px;
  gap: 4px;
}

.wave {
  width: 6px;
  height: 20px;
  background: linear-gradient(180deg, #10c1f6 0%, #5ef28c 100%);
  border-radius: 3px;
  animation: wave 1.2s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { height: 20px; }
  50% { height: 60px; }
}

.loading-title {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #10c1f6 0%, #5ea1e2 50%, #5ef28c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 32px;
}

.loading-bar-container {
  width: 100%;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 16px;
}

.loading-bar {
  height: 100%;
  background: linear-gradient(90deg, #10c1f6 0%, #5ea1e2 50%, #5ef28c 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.loading-message {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 8px;
}

.loading-percent {
  color: var(--accent);
  font-size: 28px;
  font-weight: 700;
}

/* Error Screen */
.error-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.error-content {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.error-icon {
  color: var(--error);
  margin-bottom: 16px;
}

.error-content h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-content p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

/* Header */
.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.repo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
}

.repo-icon {
  width: 16px;
  height: 16px;
  color: var(--accent);
}

.repo-name {
  font-weight: 600;
  color: var(--text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-commits {
  color: var(--text-secondary);
  padding-left: 8px;
  border-left: 1px solid var(--border);
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10c1f6 0%, #5ef28c 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon svg {
  width: 20px;
  height: 20px;
  color: white;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #10c1f6 0%, #5ef28c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav {
  display: flex;
  gap: 8px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: 12px;
}

.nav-item {
  padding: 8px 20px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover:not(.disabled) {
  color: var(--text-primary);
}

.nav-item.active {
  color: var(--text-primary);
  background: var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.nav-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-toggle:hover {
  color: var(--text-primary);
  background: var(--border);
}

.theme-toggle svg {
  width: 20px;
  height: 20px;
}

.main {
  flex: 1;
  padding: 32px 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-wrap: wrap;
    height: auto;
    padding: 12px 0;
    gap: 8px;
  }

  .logo-section {
    flex: 1;
    min-width: 0;
  }

  .logo-text {
    display: none;
  }

  .repo-badge {
    font-size: 11px;
    padding: 4px 8px;
    gap: 6px;
  }

  .repo-name {
    max-width: 100px;
  }

  .repo-commits {
    display: none;
  }

  .nav {
    order: 3;
    width: 100%;
    justify-content: center;
    gap: 4px;
  }

  .nav-item {
    padding: 8px 12px;
    font-size: 13px;
  }

  .theme-toggle {
    width: 36px;
    height: 36px;
  }
}
</style>
