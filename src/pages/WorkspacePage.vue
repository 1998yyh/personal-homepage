<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useAuthStore } from '../stores/auth'
import { browserSession } from '../lib/browser-session'
import AppIcon from '../components/AppIcon.vue'

const auth = useAuthStore()
const projects = [
  { id: 'home', name: '团子 AI', description: '对话、创作与发现', href: '/', icon: 'sparkles' },
  { id: 'xunshi', name: '循势', description: '信号筛选与个人观察池', href: '/xunshi/', icon: 'trending-up' },
  { id: 'xiaofeiyu', name: '小肥鱼', description: '翻翻她的小日子', href: '/xiaofeiyu/', icon: 'newspaper' },
  { id: 'admin', name: '管理后台', description: '系统日志与运行概览', href: '/admin/', icon: 'settings' },
  { id: 'dsh', name: 'dsh', description: '你的智能助手', href: '/dsh/', icon: 'code' },
]
const allowed = computed(() => projects.filter(project => auth.apps.includes(project.id)))
type Device = { id: string; current: boolean; userAgent: string; lastSeenAt: string; expiresAt: string }
const devices = shallowRef<Device[]>([]), error = shallowRef(''), busy = shallowRef(false)
async function load() {
  try { devices.value = (await browserSession.request<{ items: Device[] }>('/api/auth/sessions')).items }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '设备列表读取失败' }
}
async function revoke(id: string) {
  busy.value = true; error.value = ''
  try { await browserSession.request(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }); await load() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '撤销失败' }
  finally { busy.value = false }
}
async function logoutAll() {
  busy.value = true; error.value = ''
  try { await browserSession.logout(true); window.location.assign('/login') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '退出失败'; busy.value = false }
}
onMounted(load)
</script>
<template>
  <main class="workspace-page">
    <p class="workspace-eyebrow">
      YOUR PERSONAL WORKSPACE
    </p><h1>{{ auth.user?.username }}，欢迎回来。</h1><p class="workspace-muted">
      从这里，接着做你喜欢的事。
    </p>
    <div class="workspace-projects">
      <a
        v-for="project in allowed"
        :key="project.id"
        :href="project.href"
      ><AppIcon
        :name="project.icon"
        :size="25"
      /><h2>{{ project.name }}</h2><p>{{ project.description }}</p><span>进入项目 →</span></a>
    </div>
    <section class="workspace-devices">
      <h2>登录设备</h2><p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p><ul>
        <li
          v-for="device in devices"
          :key="device.id"
        >
          <div><strong>{{ device.current ? '当前设备' : '其他设备' }}</strong><p>{{ device.userAgent }}</p></div><button
            v-if="!device.current"
            type="button"
            :disabled="busy"
            @click="revoke(device.id)"
          >
            退出此设备
          </button>
        </li>
      </ul><button
        type="button"
        :disabled="busy"
        @click="logoutAll"
      >
        退出所有设备
      </button>
    </section>
  </main>
</template>
<style scoped>
.workspace-page { max-width:1080px; margin:0 auto; padding:45px 30px 70px; }
.workspace-eyebrow { font-size:11px; letter-spacing:2px; color:var(--muted); }
.workspace-page h1 { font-size:32px; font-weight:500; margin:14px 0; }
.workspace-muted { color:var(--muted); }
.workspace-projects { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:18px; margin:35px 0 45px; }
.workspace-projects a { display:block; color:var(--fg); background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:25px; text-decoration:none; }
.workspace-projects h2 { font-size:19px; margin:18px 0 9px; }
.workspace-projects p,.workspace-devices p { font-size:12px; color:var(--muted); overflow-wrap:anywhere; }
.workspace-projects span { display:block; margin-top:27px; font-size:12px; color:var(--accent); }
.workspace-devices { border-top:1px solid var(--border); padding-top:25px; }
.workspace-devices h2 { font-size:20px; font-weight:500; }
.workspace-devices ul { list-style:none; margin:20px 0; padding:0; }
.workspace-devices li { display:flex; justify-content:space-between; gap:15px; border-bottom:1px solid var(--border); padding:15px 0; }
.workspace-devices button { padding:8px 12px; border:1px solid var(--border); color:var(--fg); background:var(--surface); border-radius:7px; cursor:pointer; }
</style>
