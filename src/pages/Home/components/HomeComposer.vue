<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../../../components/AppIcon.vue'
import { useStudioStore } from '../../../stores/studio'
import { useLaunchStore } from '../../../stores/launch'

const router = useRouter()
const studio = useStudioStore()
const launch = useLaunchStore()
const prompt = ref('')
const mode = ref<'image' | 'video' | 'chat'>('image')
const modes = [{ key: 'image', label: '图像', icon: 'image' }, { key: 'video', label: '视频', icon: 'video' }, { key: 'chat', label: '对话', icon: 'message-square' }] as const
const suggestions = ['一座漂浮在云端的建筑', '未来城市的午夜电台', '极简主义品牌视觉']
function start() {
  if (mode.value === 'chat') {
    launch.chatPrompt = prompt.value.trim()
    router.push('/agents')
  } else {
    // 仅携带草稿进入真实生成台，模型和参数由用户确认后再请求生成。
    studio.startDraft(mode.value)
    studio.session(mode.value).composer.prompt = prompt.value.trim()
    router.push(`/studio/${mode.value}`)
  }
}
</script>

<template>
  <section aria-label="开始创作">
    <div class="home-composer">
      <div class="composer-tabs">
        <div class="composer-modes">
          <button
            v-for="item in modes"
            :key="item.key"
            :aria-pressed="mode === item.key"
            :class="{ active: mode === item.key }"
            @click="mode = item.key"
          >
            <AppIcon
              :name="item.icon"
              :size="17"
            />{{ item.label }}
          </button>
        </div><span>你的想法，就是起点<AppIcon
          name="sparkles"
          :size="14"
        /></span>
      </div>
      <form @submit.prevent="start">
        <label
          class="sr-only"
          for="home-prompt"
        >描述你的创作想法</label><textarea
          id="home-prompt"
          v-model="prompt"
          :placeholder="mode === 'chat' ? '有什么问题，想和 AI 一起探索？' : '描述你想创造的画面，越具体，越接近你的想象…'"
          rows="3"
        /><div class="composer-bottom">
          <span>{{ mode === 'chat' ? '选择一位 Agent，继续你的对话' : '进入生成台后选择模型与创作参数' }}</span><button
            class="od-btn od-btn-primary"
            type="submit"
          >
            {{ mode === 'chat' ? '选择 AI 助手' : '进入生成台' }}<AppIcon
              name="arrow-right"
              :size="17"
            />
          </button>
        </div>
      </form>
    </div>
    <div class="home-suggestions">
      <span>需要一点灵感？</span><button
        v-for="idea in suggestions"
        :key="idea"
        @click="prompt = idea"
      >
        {{ idea }}<AppIcon
          name="plus"
          :size="12"
        />
      </button>
    </div>
  </section>
</template>

<style scoped>
.home-composer{background:var(--surface);border:1px solid var(--border);border-radius:13px;box-shadow:var(--shadow-lift);overflow:hidden}.composer-tabs{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--border);padding:10px 18px}.composer-modes{display:flex;gap:4px}.composer-modes button{display:flex;align-items:center;gap:8px;min-height:42px;padding:8px 16px;font-size:13px;border-radius:7px;cursor:pointer;color:var(--muted)}.composer-modes button.active{background:var(--accent-soft);color:var(--accent-strong)}.composer-modes button:hover{background:var(--panel)}.composer-tabs>span{display:flex;align-items:center;gap:9px;font-size:11px;color:var(--muted)}.home-composer form{padding:20px}.home-composer textarea{background:transparent;resize:vertical;width:100%;min-height:88px;max-height:320px;color:var(--fg);font-size:15px;line-height:1.75;border:0;outline:none}.home-composer textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.home-composer textarea::placeholder{color:var(--muted)}.composer-bottom{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-top:12px}.composer-bottom>span{font-size:11px;color:var(--muted)}.composer-bottom .od-btn{gap:25px;white-space:nowrap;font-size:13px;min-height:44px}.home-suggestions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-top:15px}.home-suggestions>span{margin-right:3px}.home-suggestions button{display:flex;align-items:center;gap:8px;border:1px solid var(--border);padding:8px 10px;border-radius:6px;cursor:pointer;min-height:34px}.home-suggestions button:hover{background:var(--accent-soft);color:var(--accent-strong)}
@media(max-width:700px){.composer-tabs{padding:8px}.composer-tabs>span{display:none}.home-composer form{padding:17px}.home-composer textarea{font-size:16px}.composer-bottom{align-items:flex-end}.composer-bottom>span{max-width:135px;line-height:1.6}.composer-bottom .od-btn{gap:10px;padding:10px 13px}.home-suggestions>span{width:100%}}
</style>
