# 表单下拉引入 shadcn-vue（reka-ui 底座），建全站首个第三方组件层

生成台表单的下拉选择控件弃用原生 `<select>`，改用 shadcn-vue 风格组件（底层 reka-ui，即原 Radix Vue 的 headless 原语）。这是全站第一个第三方 UI 组件层：引 `reka-ui` 依赖，建 `components/ui/` 放二次封装组件，样式一律接现有 `od-*` 设计令牌、随 `data-theme` 亮暗切换。依据：原生 `<select>` 展开后的选项浮层是浏览器原生 UI，CSS 无法控制（尤其 macOS 系统弹层），与暗色玻璃态/亮色钴蓝的设计语言割裂；reka-ui 是 headless——只提供无障碍行为（键盘导航、焦点管理、浮层定位、点外收起），不带任何样式，与项目自有 `od-*` 令牌零冲突，且是 shadcn-vue 的底座、生态可靠。代价：新增一个运行时依赖；后续需求若继续用其它 shadcn-vue 组件，`components/ui/` 会成为一个需要维护的封装层。

**Considered Options**：①自撸轻量 Select（div 浮层 + od-* 令牌，约 60-80 行）——够用且不引依赖，但无障碍/浮层定位/键盘交互需自己保证，多控件时重复劳动；本可作原型方案，但用户为正式版选了可持续的组件层。②Naive UI / Element Plus 全功能库——被否，自带整套设计语言，与 `od-*` 令牌、亮暗主题正面冲突，需大量 `!important` 覆盖，得不偿失。③维持原生 `<select>`——被否，就是本决策要解决的「展开浮层无法定制、视觉割裂」问题。
