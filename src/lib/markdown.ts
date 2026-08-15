import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, linkify: true })

// 外链新窗口打开
const defaultLinkOpen = md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

// 围栏代码块：外包容器（语言标签 + 复制按钮），复制按钮由消费方事件委托处理
const defaultFence = md.renderer.rules.fence ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = (token.info || '').trim()
  const lang = info.split(/\s+/)[0] || ''
  // 语言标签做白名单字符过滤，防注入（html: false 不覆盖属性/标签名注入面）
  const langLabel = lang.replace(/[^a-zA-Z0-9+#-]/g, '') || 'code'
  const body = defaultFence(tokens, idx, options, env, self)
  return (
    '<div class="code-block">' +
    '<div class="code-block-head">' +
    `<span class="code-block-lang">${langLabel}</span>` +
    '<button type="button" class="code-block-copy" data-code-copy>复制</button>' +
    '</div>' +
    body +
    '</div>'
  )
}

export function renderMarkdown(source: string): string {
  try {
    return md.render(source)
  } catch {
    // 渲染失败兜底为纯文本
    const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<p>${escaped}</p>`
  }
}
