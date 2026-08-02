<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { McpServer, McpServerPayload, McpServerType } from '../../../types/mcp-server'
import { useAuthStore } from '../../../stores/auth'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  /** 传入则为编辑模式，否则为创建 */
  server?: McpServer | null
  submitting?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: McpServerPayload]
}>()

const auth = useAuthStore()
const isEdit = computed(() => !!props.server)
const isAdmin = computed(() => auth.user?.role === 'admin')

// 类型选项：stdio 会在服务端执行子进程，仅管理员可见（后端 403 契约的前端兜底）
const TYPE_OPTIONS: Array<{ value: McpServerType; label: string; desc: string }> = [
  { value: 'sse', label: 'SSE', desc: '连接已部署的远程 MCP 服务' },
  { value: 'streamable-http', label: 'Streamable HTTP', desc: 'HTTP 流式传输的远程 MCP 服务' },
  { value: 'stdio', label: 'stdio', desc: '服务端启动本地子进程（仅管理员）' },
]
const visibleTypeOptions = computed(() =>
  isAdmin.value ? TYPE_OPTIONS : TYPE_OPTIONS.filter((o) => o.value !== 'stdio'),
)

interface KvRow {
  key: string
  value: string
}

const form = reactive({
  name: '',
  type: 'sse' as McpServerType,
  description: '',
  command: '',
  args: [''] as string[],
  url: '',
  envRows: [] as KvRow[],
  headerRows: [] as KvRow[],
})

const localError = ref<string | null>(null)

// 编辑模式回填；env/headers 不回填（后端不回显），留空 = 保持原值
watch(
  () => props.server,
  (server) => {
    if (!server) return
    form.name = server.name
    form.type = server.type
    form.description = server.description ?? ''
    form.command = server.command ?? ''
    form.args = server.args?.length ? [...server.args] : ['']
    form.url = server.url ?? ''
    form.envRows = []
    form.headerRows = []
  },
  { immediate: true },
)

const addKvRow = (rows: KvRow[]) => rows.push({ key: '', value: '' })
const removeKvRow = (rows: KvRow[], idx: number) => rows.splice(idx, 1)

// 键值对行 → 对象；空 key 行忽略，全空返回 undefined（编辑时不传 = 保持原值）
const kvRowsToObject = (rows: KvRow[]): Record<string, string> | undefined => {
  const entries = rows.filter((r) => r.key.trim())
  if (!entries.length) return undefined
  return Object.fromEntries(entries.map((r) => [r.key.trim(), r.value]))
}

// Esc 关闭抽屉
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const isValidUrl = (v: string) => {
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

const handleSubmit = () => {
  localError.value = null
  if (!form.name.trim()) {
    localError.value = '请填写名称'
    return
  }
  if (form.type === 'stdio' && !form.command.trim()) {
    localError.value = 'stdio 类型必须提供 command'
    return
  }
  if (form.type !== 'stdio' && !form.url.trim()) {
    localError.value = '请填写连接地址 URL'
    return
  }
  if (form.type !== 'stdio' && !isValidUrl(form.url.trim())) {
    localError.value = 'URL 格式不正确'
    return
  }

  const payload: McpServerPayload = {
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim() || undefined,
  }
  if (form.type === 'stdio') {
    payload.command = form.command.trim()
    const args = form.args.map((a) => a.trim()).filter(Boolean)
    if (args.length) payload.args = args
    const env = kvRowsToObject(form.envRows)
    if (env) payload.env = env
  } else {
    payload.url = form.url.trim()
    const headers = kvRowsToObject(form.headerRows)
    if (headers) payload.headers = headers
  }

  emit('submit', payload)
}
</script>

<template>
  <!-- 遮罩 -->
  <div
    class="od-drawer-overlay"
    @click.self="emit('close')"
  />

  <!-- 右侧抽屉 -->
  <aside class="od-drawer">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <h2 class="font-display font-bold text-[17px] text-fg">
        {{ isEdit ? '编辑 MCP Server' : '新建 MCP Server' }}
      </h2>
      <button
        class="od-icon-btn !w-9 !h-9"
        aria-label="关闭"
        @click="emit('close')"
      >
        <AppIcon
          name="x"
          :size="16"
        />
      </button>
    </div>

    <!-- 表单主体（可滚动） -->
    <form
      id="mcp-server-form"
      class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label class="od-label">名称 *</label>
        <input
          v-model="form.name"
          class="od-input"
          autocomplete="off"
          placeholder="如：web-search"
        >
        <p class="text-muted text-xs mt-1.5">
          全局唯一，重复时后端会返回「名称已存在」
        </p>
      </div>

      <!-- 连接类型：创建时可选（非管理员无 stdio），编辑时锁定 -->
      <div>
        <label class="od-label">连接类型 *</label>
        <div
          v-if="!isEdit"
          class="flex flex-col gap-2"
        >
          <label
            v-for="opt in visibleTypeOptions"
            :key="opt.value"
            class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            :class="form.type === opt.value
              ? 'border-accent bg-accent-soft'
              : 'border-border hover:bg-fg/5'"
          >
            <input
              v-model="form.type"
              type="radio"
              name="mcp-type"
              class="mt-0.5 accent-[var(--accent)]"
              :value="opt.value"
            >
            <span>
              <span class="block text-fg text-sm font-medium">{{ opt.label }}</span>
              <span class="block text-muted text-xs mt-0.5">{{ opt.desc }}</span>
            </span>
          </label>
        </div>
        <p
          v-else
          class="od-input !bg-fg/5 text-muted"
        >
          {{ form.type }}（编辑时不可修改类型）
        </p>
      </div>

      <!-- stdio 专属字段 -->
      <template v-if="form.type === 'stdio'">
        <div>
          <label class="od-label">执行命令 *</label>
          <input
            v-model="form.command"
            class="od-input"
            autocomplete="off"
            placeholder="如：npx"
          >
        </div>

        <div>
          <label class="od-label">命令参数</label>
          <div class="flex flex-col gap-2">
            <div
              v-for="(_, idx) in form.args"
              :key="idx"
              class="flex gap-2"
            >
              <input
                v-model="form.args[idx]"
                class="od-input flex-1"
                autocomplete="off"
                :placeholder="idx === 0 ? '如：-y' : '如：@modelcontextprotocol/server-filesystem'"
              >
              <button
                type="button"
                class="od-icon-btn !w-9 !h-9 shrink-0 self-center"
                :disabled="form.args.length <= 1"
                aria-label="删除参数"
                @click="form.args.splice(idx, 1)"
              >
                <AppIcon
                  name="x"
                  :size="14"
                />
              </button>
            </div>
            <button
              type="button"
              class="od-btn od-btn-ghost self-start"
              @click="form.args.push('')"
            >
              <AppIcon
                name="plus"
                :size="14"
              />
              添加参数
            </button>
          </div>
        </div>

        <div>
          <label class="od-label">环境变量{{ isEdit ? '（留空则不修改）' : '（可选）' }}</label>
          <div class="flex flex-col gap-2">
            <div
              v-for="(row, idx) in form.envRows"
              :key="idx"
              class="flex gap-2"
            >
              <input
                v-model="row.key"
                class="od-input flex-1"
                autocomplete="off"
                placeholder="变量名，如 API_KEY"
              >
              <input
                v-model="row.value"
                class="od-input flex-1"
                autocomplete="off"
                placeholder="值"
              >
              <button
                type="button"
                class="od-icon-btn !w-9 !h-9 shrink-0 self-center"
                aria-label="删除环境变量"
                @click="removeKvRow(form.envRows, idx)"
              >
                <AppIcon
                  name="x"
                  :size="14"
                />
              </button>
            </div>
            <button
              type="button"
              class="od-btn od-btn-ghost self-start"
              @click="addKvRow(form.envRows)"
            >
              <AppIcon
                name="plus"
                :size="14"
              />
              添加环境变量
            </button>
          </div>
          <p class="text-muted text-xs mt-1.5">
            加密存储，提交后不再回显{{ isEdit ? '；填写则整体覆盖原值' : '' }}
          </p>
        </div>
      </template>

      <!-- sse / streamable-http 专属字段 -->
      <template v-else>
        <div>
          <label class="od-label">连接地址 *</label>
          <input
            v-model="form.url"
            class="od-input"
            autocomplete="off"
            placeholder="如：https://mcp.example.com/sse"
          >
        </div>

        <div>
          <label class="od-label">请求头{{ isEdit ? '（留空则不修改）' : '（可选）' }}</label>
          <div class="flex flex-col gap-2">
            <div
              v-for="(row, idx) in form.headerRows"
              :key="idx"
              class="flex gap-2"
            >
              <input
                v-model="row.key"
                class="od-input flex-1"
                autocomplete="off"
                placeholder="如 Authorization"
              >
              <input
                v-model="row.value"
                class="od-input flex-1"
                autocomplete="off"
                placeholder="如 Bearer xxx"
              >
              <button
                type="button"
                class="od-icon-btn !w-9 !h-9 shrink-0 self-center"
                aria-label="删除请求头"
                @click="removeKvRow(form.headerRows, idx)"
              >
                <AppIcon
                  name="x"
                  :size="14"
                />
              </button>
            </div>
            <button
              type="button"
              class="od-btn od-btn-ghost self-start"
              @click="addKvRow(form.headerRows)"
            >
              <AppIcon
                name="plus"
                :size="14"
              />
              添加请求头
            </button>
          </div>
          <p class="text-muted text-xs mt-1.5">
            加密存储，提交后不再回显{{ isEdit ? '；填写则整体覆盖原值' : '' }}
          </p>
        </div>
      </template>

      <div>
        <label class="od-label">描述</label>
        <textarea
          v-model="form.description"
          class="od-input resize-none"
          rows="2"
          placeholder="展示在 Agent 配置界面，说明这个 Server 提供什么能力"
        />
      </div>

      <!-- 错误展示 -->
      <p
        v-if="localError || serverError"
        class="od-error"
      >
        {{ localError || serverError }}
      </p>
    </form>

    <!-- 底部操作 -->
    <div class="flex gap-3 px-6 py-4 border-t border-border shrink-0">
      <button
        type="button"
        class="od-btn od-btn-ghost flex-1"
        @click="emit('close')"
      >
        取消
      </button>
      <button
        type="submit"
        form="mcp-server-form"
        class="od-btn od-btn-primary flex-1"
        :disabled="submitting"
      >
        {{ submitting ? '提交中...' : isEdit ? '保存' : '创建' }}
      </button>
    </div>
  </aside>
</template>
