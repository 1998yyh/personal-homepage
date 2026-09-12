<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
</script>

<template>
  <section class="home-features">
    <div class="features-heading">
      <div><span>探索更多可能</span><h2>下一步，由你定义。</h2></div><router-link to="/assets">
        我的素材<AppIcon
          name="arrow-right"
          :size="15"
        />
      </router-link>
    </div>
    <div class="feature-grid">
      <router-link
        to="/studio/image"
        class="feature-card feature-visual"
      >
        <div
          class="feature-landscape"
          aria-hidden="true"
        >
          <i class="landscape-planet" /><i class="landscape-mountain" /><i class="landscape-mountain mountain-small" />
        </div><span class="feature-eyebrow">01 / 图像创作</span><div class="feature-description">
          <div><h3>造一个，只属于你的世界。</h3><p>从一段文字，到一幅超越想象的画面。</p></div><span class="feature-arrow"><AppIcon
            name="arrow-right"
            :size="19"
          /></span>
        </div>
      </router-link>
      <router-link
        to="/canvas"
        class="feature-card feature-canvas"
      >
        <div
          class="feature-nodes"
          aria-hidden="true"
        >
          <i class="node-connection" /><span class="art-node node-text"><AppIcon
            name="type"
            :size="22"
          /></span><span class="art-node node-image"><AppIcon
            name="image"
            :size="28"
          /></span><span class="art-node node-spark"><AppIcon
            name="sparkles"
            :size="20"
          /></span>
        </div><span class="feature-eyebrow">02 / 无限画布</span><div class="feature-description">
          <div><h3>好想法，值得展开。</h3><p>一张画布，连接灵感与创作。</p></div><span class="feature-arrow"><AppIcon
            name="arrow-right"
            :size="19"
          /></span>
        </div>
      </router-link>
    </div>
    <router-link
      to="/ai-news"
      class="home-news-link"
    >
      <span><AppIcon
        name="newspaper"
        :size="20"
      /><b>从 AI 新知中，发现下一个灵感</b></span><span>阅读 AI 资讯<AppIcon
        name="arrow-right"
        :size="16"
      /></span>
    </router-link>
  </section>
</template>

<style scoped>
.home-features{margin-top:40px}.features-heading{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px}.features-heading>div>span{font-size:11px;letter-spacing:.1em;color:var(--muted)}.features-heading h2{font-size:21px;font-weight:550;margin-top:7px;letter-spacing:-.035em}.features-heading>a{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--accent-strong);padding:10px 0}.feature-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}.feature-card{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;min-height:238px;border:1px solid var(--border);border-radius:12px;padding:23px;background:var(--panel)}.feature-card:hover{border-color:var(--accent);box-shadow:var(--shadow-lift)}.feature-eyebrow{position:relative;z-index:1;font-size:10px;color:var(--accent-strong);letter-spacing:.08em}.feature-description{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:110px}.feature-description h3{font-size:18px;font-weight:550;letter-spacing:-.035em}.feature-description p{font-size:12px;color:var(--muted);margin-top:6px}.feature-arrow{display:grid;place-items:center;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--accent-strong);width:34px;height:34px;flex-shrink:0}.feature-landscape{position:absolute;inset:0;background:linear-gradient(150deg,color-mix(in srgb,var(--art-3) 22%,var(--bg)),var(--panel))}.feature-landscape:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 5%,color-mix(in srgb,var(--bg) 30%,transparent) 45%,var(--bg))}.landscape-planet{position:absolute;right:14%;top:20px;width:108px;height:108px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--art-1),var(--art-2) 40%,var(--art-4) 90%)}.landscape-mountain{position:absolute;width:210px;height:190px;clip-path:polygon(48% 0,100% 100%,0 100%);background:linear-gradient(100deg,var(--art-2),var(--art-3) 48%,var(--art-4) 49%);left:35%;top:30px}.mountain-small{left:-8%;top:90px;width:260px;height:170px}.feature-nodes{position:absolute;inset:0;background-image:radial-gradient(var(--art-3) .7px,transparent .7px);background-size:18px 18px;mask-image:linear-gradient(#000 30%,transparent 75%)}.art-node{position:absolute;border:1px solid var(--art-3);border-radius:8px;background:var(--surface);color:var(--accent-strong);box-shadow:var(--shadow-card);display:grid;place-items:center}.node-text{left:12%;top:40px;width:88px;height:52px;transform:rotate(-4deg)}.node-image{left:46%;top:34px;width:90px;height:80px;transform:rotate(6deg);background:linear-gradient(145deg,var(--panel),var(--art-3))}.node-spark{right:8%;top:110px;width:86px;height:40px;transform:rotate(-4deg)}.node-connection{position:absolute;left:23%;top:65px;width:62%;height:68px;border:1px solid var(--art-3);border-left:0;border-top:0;border-radius:0 0 25px 0}.home-news-link{display:flex;justify-content:space-between;align-items:center;gap:18px;border:1px solid var(--border);border-radius:11px;padding:19px 22px;margin-top:20px}.home-news-link>span{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:12px}.home-news-link b{font-size:13px;font-weight:500;color:var(--fg)}.home-news-link:hover{background:var(--surface)}
@media(max-width:700px){.feature-grid{grid-template-columns:1fr}.feature-card{min-height:235px}.feature-description h3{font-size:18px}.home-news-link{padding:17px;align-items:flex-start;flex-direction:column;gap:12px}.home-news-link b{font-size:12px}.home-news-link>span:last-child{padding-left:32px}}
</style>
