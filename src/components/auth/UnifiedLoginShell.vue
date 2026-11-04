<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import { useTheme } from '../../composables/useTheme'
import mascot from '../../assets/login-mascot.png'
// 纯展示外壳遵循已选定的深蓝布局；登录行为由插槽中的正式表单负责。
defineProps<{ destination: string }>()
const { theme, toggleTheme } = useTheme()
const dark = computed(() => theme.value === 'dark')
</script>

<template>
  <main
    class="unified-login-shell"
    :class="{ 'login-dark': dark }"
  >
    <section class="a-story">
      <div class="lp-brand a-brand">
        <span class="lp-logo"><AppIcon
          name="sparkles"
          :size="23"
        /></span>
        <span>团子<span class="lp-brand-caption">PERSONAL WORKSPACE</span></span>
      </div>
      <div class="a-intro">
        <p class="lp-eyebrow">
          ONE SPACE. ALL YOUR EVERYDAY.
        </p>
        <h1>灵感、观察、<br>还有你的<span>碎碎念。</span></h1>
        <p class="a-lede">
          从一个想法，到一点日常。<br>那些你在意的事，都在这里慢慢发生。
        </p>
      </div>
      <div class="a-projects">
        <div>
          <AppIcon
            name="sparkles"
            :size="20"
          /><span>团子 AI<small>把想法变成作品</small></span>
        </div>
        <div>
          <AppIcon
            name="trending-up"
            :size="20"
          /><span>循势<small>保持自己的观察节奏</small></span>
        </div>
        <div>
          <AppIcon
            name="newspaper"
            :size="20"
          /><span>小肥鱼<small>收藏日常的小小瞬间</small></span>
        </div>
        <div>
          <AppIcon
            name="code"
            :size="20"
          /><span>dsh<small>一起完成下一件事</small></span>
        </div>
      </div>
      <div class="a-companion">
        <div class="a-orbit" />
        <img
          :src="mascot"
          alt="小肥鱼，蓝发鲸鱼娘陪伴角色"
        >
        <span class="a-speech">你回来啦，今天也一起加油。</span>
        <div class="a-companion-caption">
          <span>LITTLE FISH, LITTLE DAYS</span><p>小肥鱼一直在这里。</p>
        </div>
      </div>
      <footer class="a-story-footer">
        <span>对话 · 创作 · 观察 · 日常</span><span>一个账号，连接你的世界。</span>
      </footer>
    </section>
    <section class="a-signin">
      <header class="a-signin-nav">
        <router-link
          to="/"
          class="lp-back"
        >
          <AppIcon
            name="arrow-left"
            :size="15"
          />返回首页
        </router-link>
        <button
          class="lp-theme-toggle"
          type="button"
          :aria-label="dark ? '切换浅色' : '切换深色'"
          @click="toggleTheme"
        >
          <AppIcon
            :name="dark ? 'sun' : 'moon'"
            :size="19"
          />
        </button>
      </header>
      <div class="a-form-content">
        <span class="lp-eyebrow">WELCOME BACK</span>
        <h2>欢迎回到你的空间</h2>
        <p class="lp-secondary">
          登录一次，接着做你喜欢的事。
        </p>
        <div class="a-destination">
          <AppIcon
            name="group"
            :size="21"
          /><div><small>登录后前往</small><span>{{ destination }}</span></div><AppIcon
            name="arrow-right"
            :size="16"
          />
        </div>
        <slot />
        <div class="a-form-note">
          <AppIcon
            name="shield-check"
            :size="15"
          /><span>使用现有团子账号，访问已授权的项目。</span>
        </div>
      </div>
      <footer class="a-footer">
        团子个人工作空间<span>为日常，留一个自己的地方。</span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.unified-login-shell { --lp-ink:#24324a; --lp-muted:#748199; --lp-surface:#fff; --lp-canvas:#f4f6fc; --lp-border:#e1e7f1; --lp-soft:#f0f3ff; --lp-accent:#4d6bfe; --lp-on-accent:#fff; --login-ink:var(--lp-ink); --login-paper:var(--lp-surface); --login-border:var(--lp-border); --login-blue:var(--lp-accent); --login-muted:var(--lp-muted); --login-soft:var(--lp-soft); --login-on-blue:var(--lp-on-accent); color:var(--lp-ink); font:14px/1.6 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif; }
.unified-login-shell.login-dark { --lp-ink:#eaf0fc; --lp-muted:#a3b1ca; --lp-surface:#19263b; --lp-border:#35455f; --lp-soft:#263655; --lp-accent:#8a9cff; --lp-on-accent:#13203d; }
.unified-login-shell * { box-sizing:border-box; }
.unified-login-shell :is(h1,h2,p) { margin:0; }
.lp-brand { display:flex; align-items:center; gap:12px; font-size:22px; font-weight:600; }
.lp-logo { width:41px; height:41px; display:grid; place-items:center; background:var(--lp-accent); color:var(--lp-on-accent); border-radius:13px; }
.lp-brand-caption { display:block; font-size:9px; font-weight:400; letter-spacing:1.5px; }
.lp-eyebrow { font-size:10px; letter-spacing:1.7px; color:var(--lp-accent); }
.lp-secondary { font-size:13px; color:var(--lp-muted); }
.lp-back { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--lp-muted); text-decoration:none; }
.lp-theme-toggle { display:grid; place-items:center; width:37px; height:37px; border:1px solid var(--lp-border); border-radius:50%; background:transparent; color:var(--lp-muted); cursor:pointer; }

.unified-login-shell { min-height:100svh; display:grid; grid-template-columns:1.06fr 1fr; }
.a-story { color:#f3f6ff; background:#17273f; padding:42px 8% 29px; display:flex; flex-direction:column; position:relative; overflow:hidden; }
.a-brand { color:#f4f6ff; }
.a-brand .lp-brand-caption { color:#a7b6cf; }
.a-intro { margin-top:70px; }
.a-intro .lp-eyebrow { color:#a5b5d1; }
.a-intro h1 { font-size:clamp(35px,3.5vw,57px); line-height:1.45; font-weight:550; letter-spacing:-1.8px; margin:22px 0 19px; }
.a-intro h1 span { color:#aebdff; }
.a-lede { color:#aab9d3; font-size:14px; line-height:1.95; }
.a-projects { display:grid; grid-template-columns:1fr 1fr; gap:26px 15px; margin-top:36px; }
.a-projects>div { display:flex; gap:13px; align-items:center; font-size:14px; }
.a-projects :deep(svg) { color:#a4b8ff; }
.a-projects small { display:block; color:#aab9d3; font-size:11px; margin-top:4px; }
.a-companion { position:relative; min-height:220px; flex:1; margin-top:22px; }
.a-companion img { position:absolute; width:205px; height:205px; object-fit:contain; bottom:5px; left:-15px; z-index:1; }
.a-orbit { background:#273b59; width:165px; height:165px; position:absolute; border-radius:50%; bottom:11px; left:3px; }
.a-speech { position:absolute; bottom:164px; left:168px; padding:10px 14px; color:#d5def5; background:#2b3e5d; border-radius:14px 14px 14px 0; transform:rotate(-3deg); font-size:11px; white-space:nowrap; }
.a-companion-caption { position:absolute; left:207px; bottom:39px; }
.a-companion-caption>span { font-size:9px; letter-spacing:1.6px; color:#aab9d3; }
.a-companion-caption p { margin-top:7px; font-size:13px; }
.a-story-footer { border-top:1px solid #354761; padding-top:19px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; color:#aab9d3; font-size:10px; }
.a-signin { background:var(--lp-surface); padding:35px 7% 36px; display:flex; flex-direction:column; min-width:0; }
.a-signin-nav { display:flex; justify-content:space-between; align-items:center; }
.a-form-content { width:100%; max-width:375px; margin:auto; padding:65px 0 50px; }
.a-form-content h2 { font-size:31px; font-weight:600; letter-spacing:-.8px; margin-top:13px; margin-bottom:10px; }
.a-destination { margin-top:30px; display:flex; align-items:center; gap:13px; border-radius:12px; background:var(--lp-soft); padding:14px 17px; color:var(--lp-accent); }
.a-destination>div { display:flex; flex-direction:column; flex:1; }
.a-destination small { color:var(--lp-muted); font-size:11px; }
.a-destination span { color:var(--lp-ink); font-size:13px; margin-top:3px; }
.a-form-note { display:flex; gap:7px; justify-content:center; color:var(--lp-muted); font-size:11px; margin-top:4px; }
.a-footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; color:var(--lp-muted); font-size:10px; }
@media(min-width:1700px) { .a-story { padding-left:12%; padding-right:12%; } }
@media(max-width:1050px) { .a-story { padding:32px 30px 25px; } .a-signin { padding:28px 30px 36px; } .a-companion-caption { left:185px; } .a-speech { left:150px; font-size:10px; padding:9px; } .a-intro { margin-top:50px; } }
@media(max-width:760px) { .unified-login-shell { grid-template-columns:1fr; } .a-story { padding:25px; min-height:245px; } .a-intro { margin-top:28px; z-index:2; } .a-intro .lp-eyebrow { font-size:9px; } .a-intro h1 { font-size:33px; margin:13px 0 12px; line-height:1.4; letter-spacing:-1px; } .a-lede { font-size:11px; max-width:210px; } .a-projects,.a-story-footer,.a-companion-caption,.a-speech { display:none; } .a-companion { position:absolute; bottom:12px; right:12px; width:140px; height:140px; min-height:0; margin:0; opacity:.85; } .a-companion img { width:145px; height:145px; left:0; } .a-orbit { width:110px; height:110px; } .a-signin { padding:25px 25px 36px; } .a-form-content { max-width:430px; padding:34px 0; } .a-form-content h2 { font-size:27px; } .a-footer { display:none; } }
@media(max-width:380px) { .a-companion { right:-8px; opacity:.65; } .a-intro h1 { font-size:30px; } .a-form-content h2 { font-size:25px; } }
</style>
