<script setup lang="ts">
import HomeHero from './Home/components/HomeHero.vue'
import HomeComposer from './Home/components/HomeComposer.vue'
import HomeFeatures from './Home/components/HomeFeatures.vue'
</script>

<template>
  <main class="home-page">
    <HomeHero /><HomeComposer /><HomeFeatures /><footer class="home-footer">
      <span>团子 AI · 为创造而生</span><span>对话 / 创作 / 发现</span>
    </footer>
  </main>
</template>

<style scoped>
.home-page{max-width:1160px;padding:0 40px 35px;margin:0 auto;min-width:0}.home-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;color:var(--muted);font-size:11px;margin-top:28px}@media(max-width:700px){.home-page{padding:0 20px 28px}.home-footer{font-size:10px}}
</style>
