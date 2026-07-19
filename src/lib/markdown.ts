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

export function renderMarkdown(source: string): string {
  try {
    return md.render(source)
  } catch {
    // 渲染失败兜底为纯文本
    const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<p>${escaped}</p>`
  }
}
