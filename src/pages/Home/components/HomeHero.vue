<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
</script>

<template>
  <section class="home-hero">
    <div class="home-intro">
      <div class="home-eyebrow">
        <span />你的 AI 创作空间
      </div><h1>想象不设限。<br><span>现在，开始创造。</span></h1><p>把文字变成画面，把灵感连接成作品。<br>你的下一件创作，从这里开始。</p><div class="home-capabilities">
        <span>多模态创作</span><i /><span>Agent 协作</span><i /><span>无限画布</span>
      </div>
    </div>
    <div
      class="creative-orbit"
      aria-hidden="true"
    >
      <div class="orbit-glow" /><div class="orbit-grid" /><div class="orbit-ring ring-one" /><div class="orbit-ring ring-two" /><div class="orbit-ring ring-three" /><div class="orbit-core" /><span class="orbit-note">IDEAS INTO REALITY</span><AppIcon
        class="orbit-spark"
        name="plus"
        :size="17"
      />
    </div>
  </section>
</template>

<style scoped>
.home-hero{display:grid;grid-template-columns:1.15fr 1fr;gap:30px;min-height:350px;align-items:center;padding:36px 0 28px}.home-eyebrow{display:flex;gap:8px;align-items:center;font-size:11px;letter-spacing:.12em;color:var(--accent-strong)}.home-eyebrow>span{width:5px;height:5px;border-radius:50%;background:var(--accent)}.home-intro h1{font-size:clamp(30px,3.3vw,44px);font-weight:600;letter-spacing:-.045em;line-height:1.4;margin:20px 0 18px}.home-intro h1>span{color:var(--accent-strong)}.home-intro p{font-size:14px;line-height:1.9;color:var(--muted)}.home-capabilities{display:flex;align-items:center;gap:13px;font-size:11px;color:var(--muted);margin-top:24px}.home-capabilities i{width:3px;height:3px;border-radius:50%;background:var(--border)}.creative-orbit{height:290px;position:relative;overflow:hidden}.orbit-glow{position:absolute;inset:0;background:radial-gradient(ellipse,color-mix(in srgb,var(--accent) 9%,transparent),transparent 65%)}.orbit-grid{position:absolute;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:34px 34px;opacity:.15;mask-image:radial-gradient(ellipse,#000,transparent 65%)}.orbit-ring{position:absolute;left:calc(50% - 110px);top:32px;width:220px;height:220px;border:18px solid var(--art-2);border-radius:50%;box-shadow:inset 3px 2px 8px #ffffff70,inset -5px -4px 8px var(--art-4),3px 4px 10px color-mix(in srgb,var(--art-4) 30%,transparent)}.ring-one{transform:rotate(-31deg) scaleX(.46);z-index:3}.ring-two{transform:rotate(40deg) scaleX(.46);z-index:2;border-color:var(--art-1)}.ring-three{transform:rotate(95deg) scaleX(.42);z-index:1;border-color:var(--art-3)}.orbit-core{position:absolute;left:calc(50% - 31px);top:calc(50% - 33px);width:63px;height:63px;border-radius:50%;z-index:4;background:radial-gradient(circle at 30% 30%,var(--art-1),var(--accent) 40%,var(--art-3) 70%,var(--art-4));box-shadow:0 0 35px color-mix(in srgb,var(--accent) 15%,transparent)}.orbit-note{position:absolute;bottom:16px;right:25px;font-size:8px;letter-spacing:.14em;color:var(--muted)}.orbit-spark{position:absolute;right:16px;top:58px;color:var(--art-3)}
@media(max-width:700px){.home-hero{display:block;position:relative;padding-top:34px;min-height:315px}.home-intro{position:relative;z-index:2}.home-intro h1{font-size:32px}.home-intro p{font-size:13px}.creative-orbit{position:absolute;right:-20px;top:40px;width:185px;opacity:.18;pointer-events:none}.orbit-note{display:none}}
</style>
