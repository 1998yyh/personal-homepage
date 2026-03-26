import { useState, useCallback } from 'react';
import Navbar from '../../components/Navbar';

interface Tool {
  id: string;
  name: string;
  icon: string;
  category: string;
}

const tools: Tool[] = [
  // 编码/解码
  { id: 'base64', name: 'Base64', icon: '🔤', category: '编码/解码' },
  { id: 'url', name: 'URL 编码', icon: '🔗', category: '编码/解码' },
  { id: 'html-entity', name: 'HTML 实体', icon: '📄', category: '编码/解码' },
  { id: 'unicode', name: 'Unicode', icon: '🌐', category: '编码/解码' },
  // 格式化
  { id: 'json', name: 'JSON 格式化', icon: '📋', category: '格式化' },
  // 转换
  { id: 'timestamp', name: '时间戳转换', icon: '⏰', category: '转换' },
  { id: 'color', name: '颜色转换', icon: '🎨', category: '转换' },
  { id: 'number-base', name: '进制转换', icon: '🔢', category: '转换' },
  // 生成
  { id: 'uuid', name: 'UUID 生成', icon: '🔑', category: '生成' },
  { id: 'password', name: '随机密码', icon: '🔐', category: '生成' },
  { id: 'hash', name: 'Hash 计算', icon: '✔️', category: '生成' },
];

const categories = [...new Set(tools.map(t => t.category))];

export default function DevToolsPage() {
  const [selectedTool, setSelectedTool] = useState<Tool>(tools[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTool = useCallback(() => {
    switch (selectedTool.id) {
      case 'base64':
        return <Base64Tool />;
      case 'url':
        return <UrlTool />;
      case 'html-entity':
        return <HtmlEntityTool />;
      case 'unicode':
        return <UnicodeTool />;
      case 'json':
        return <JsonTool />;
      case 'timestamp':
        return <TimestampTool />;
      case 'color':
        return <ColorTool />;
      case 'number-base':
        return <NumberBaseTool />;
      case 'uuid':
        return <UuidTool />;
      case 'password':
        return <PasswordTool />;
      case 'hash':
        return <HashTool />;
      default:
        return <div className="text-white/40">选择一个工具开始使用</div>;
    }
  }, [selectedTool]);

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* 导航栏 */}
      <Navbar />

      {/* 主内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4 h-[calc(100vh-88px)]">
          {/* 左侧：工具列表 */}
          <div className="w-56 flex-shrink-0 glass-dark rounded-xl overflow-hidden">
            <div className="px-3 py-3 border-b border-white/[0.06]">
              <input
                type="text"
                placeholder="搜索工具..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 rounded-lg text-sm text-white placeholder-white/30 border border-transparent focus:border-white/10 focus:outline-none"
              />
            </div>
            <div className="p-2 h-[calc(100%-60px)] overflow-y-auto">
              {categories.map(category => {
                const categoryTools = filteredTools.filter(t => t.category === category);
                if (categoryTools.length === 0) return null;
                return (
                  <div key={category} className="mb-3">
                    <h3 className="text-white/30 text-xs font-medium px-2 mb-1">{category}</h3>
                    {categoryTools.map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => setSelectedTool(tool)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          selectedTool.id === tool.id
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{tool.icon}</span>
                        <span className="text-sm">{tool.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧：工具工作区 */}
          <div className="flex-1 glass-dark rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <span className="text-xl">{selectedTool.icon}</span>
              <h2 className="text-lg font-medium text-white">{selectedTool.name}</h2>
            </div>
            <div className="p-6 h-[calc(100%-60px)] overflow-y-auto">
              {renderTool()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============ 工具组件 ============

// Base64 工具
function Base64Tool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const encode = () => {
    try {
      setOutput(btoa(unescape(encodeURIComponent(input))));
      setError('');
    } catch (e) {
      setError('编码失败');
    }
  };

  const decode = () => {
    try {
      setOutput(decodeURIComponent(escape(atob(input))));
      setError('');
    } catch (e) {
      setError('解码失败：输入不是有效的 Base64 字符串');
    }
  };

  return (
    <ToolLayout
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      buttons={[
        { label: '编码', onClick: encode },
        { label: '解码', onClick: decode },
      ]}
    />
  );
}

// URL 编码工具
function UrlTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const encode = () => {
    try {
      setOutput(encodeURIComponent(input));
      setError('');
    } catch (e) {
      setError('编码失败');
    }
  };

  const decode = () => {
    try {
      setOutput(decodeURIComponent(input));
      setError('');
    } catch (e) {
      setError('解码失败：输入不是有效的 URL 编码字符串');
    }
  };

  return (
    <ToolLayout
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      buttons={[
        { label: '编码', onClick: encode },
        { label: '解码', onClick: decode },
      ]}
    />
  );
}

// HTML 实体工具
function HtmlEntityTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const encode = () => {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    setOutput(input.replace(/[&<>"']/g, char => htmlEntities[char]));
    setError('');
  };

  const decode = () => {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    setOutput(doc.documentElement.textContent || '');
    setError('');
  };

  return (
    <ToolLayout
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      buttons={[
        { label: '编码', onClick: encode },
        { label: '解码', onClick: decode },
      ]}
    />
  );
}

// Unicode 工具
function UnicodeTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const encode = () => {
    setOutput(
      input.split('').map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')).join('')
    );
    setError('');
  };

  const decode = () => {
    try {
      setOutput(
        input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
      );
      setError('');
    } catch (e) {
      setError('解码失败');
    }
  };

  return (
    <ToolLayout
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      buttons={[
        { label: '编码', onClick: encode },
        { label: '解码', onClick: decode },
      ]}
    />
  );
}

// JSON 格式化工具
function JsonTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError('JSON 格式错误：' + (e as Error).message);
    }
  };

  const compress = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError('JSON 格式错误：' + (e as Error).message);
    }
  };

  const escape = () => {
    try {
      setOutput(JSON.stringify(input));
      setError('');
    } catch (e) {
      setError('转义失败');
    }
  };

  return (
    <ToolLayout
      input={input}
      setInput={setInput}
      output={output}
      error={error}
      buttons={[
        { label: '格式化', onClick: format },
        { label: '压缩', onClick: compress },
        { label: '转义', onClick: escape },
      ]}
      outputHeight="h-80"
    />
  );
}

// 时间戳转换工具
function TimestampTool() {
  const [timestamp, setTimestamp] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [results, setResults] = useState<string[]>([]);

  const now = Date.now();

  const timestampToDate = () => {
    const ts = parseInt(timestamp);
    if (isNaN(ts)) return;
    
    const date = new Date(ts);
    const date10 = new Date(ts * 1000);
    
    setResults([
      `毫秒时间戳: ${ts}`,
      `本地时间: ${date.toLocaleString('zh-CN')}`,
      `ISO 格式: ${date.toISOString()}`,
      `UTC 时间: ${date.toUTCString()}`,
      `---`,
      `如果输入的是秒级时间戳:`,
      `本地时间: ${date10.toLocaleString('zh-CN')}`,
      `ISO 格式: ${date10.toISOString()}`,
    ]);
  };

  const dateToTimestamp = () => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;
    
    setResults([
      `毫秒时间戳: ${date.getTime()}`,
      `秒级时间戳: ${Math.floor(date.getTime() / 1000)}`,
      `本地时间: ${date.toLocaleString('zh-CN')}`,
      `ISO 格式: ${date.toISOString()}`,
    ]);
  };

  const setNow = () => {
    setTimestamp(now.toString());
    const date = new Date(now);
    setResults([
      `当前毫秒时间戳: ${now}`,
      `当前秒级时间戳: ${Math.floor(now / 1000)}`,
      `本地时间: ${date.toLocaleString('zh-CN')}`,
      `ISO 格式: ${date.toISOString()}`,
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <button
          onClick={setNow}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
        >
          获取当前时间戳
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-white/60 text-sm mb-2">时间戳 → 日期</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="输入时间戳..."
              className="flex-1 px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-white/20 focus:outline-none"
            />
            <button
              onClick={timestampToDate}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              转换
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-sm mb-2">日期 → 时间戳</label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10 focus:border-white/20 focus:outline-none"
            />
            <button
              onClick={dateToTimestamp}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              转换
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          {results.map((line, i) => (
            <div key={i} className={`text-sm font-mono ${line.startsWith('---') ? 'text-white/20 my-2' : 'text-white/80'}`}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 颜色转换工具
function ColorTool() {
  const [hex, setHex] = useState('#3b82f6');
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [hsl, setHsl] = useState({ h: 217, s: 91, l: 60 });

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const updateFromHex = (newHex: string) => {
    setHex(newHex);
    const rgbVal = hexToRgb(newHex);
    if (rgbVal) {
      setRgb(rgbVal);
      setHsl(rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div 
          className="w-24 h-24 rounded-xl shadow-lg"
          style={{ backgroundColor: hex }}
        />
        <div>
          <input
            type="color"
            value={hex}
            onChange={(e) => updateFromHex(e.target.value)}
            className="w-12 h-10 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-white/60 text-sm mb-2">HEX</label>
          <input
            type="text"
            value={hex}
            onChange={(e) => updateFromHex(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
          />
        </div>
        <div>
          <label className="block text-white/60 text-sm mb-2">RGB</label>
          <input
            type="text"
            value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
            readOnly
            className="w-full px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
          />
        </div>
        <div>
          <label className="block text-white/60 text-sm mb-2">HSL</label>
          <input
            type="text"
            value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`}
            readOnly
            className="w-full px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
          />
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-white/40 text-sm">CSS 变量:</p>
        <code className="text-cyan-400 text-sm">--color: {hex};</code>
      </div>
    </div>
  );
}

// 进制转换工具
function NumberBaseTool() {
  const [input, setInput] = useState('255');
  const [base, setBase] = useState(10);
  const [results, setResults] = useState<Record<string, string>>({});

  const convert = () => {
    const num = parseInt(input, base);
    if (isNaN(num)) {
      setResults({});
      return;
    }
    setResults({
      '二进制': num.toString(2),
      '八进制': num.toString(8),
      '十进制': num.toString(10),
      '十六进制': num.toString(16).toUpperCase(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <select
          value={base}
          onChange={(e) => setBase(parseInt(e.target.value))}
          className="px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10"
        >
          <option value={2}>二进制</option>
          <option value={8}>八进制</option>
          <option value={10}>十进制</option>
          <option value={16}>十六进制</option>
        </select>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入数值..."
          className="flex-1 px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
        />
        <button
          onClick={convert}
          className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
        >
          转换
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(results).map(([name, value]) => (
            <div key={name} className="bg-white/5 rounded-lg p-4">
              <p className="text-white/40 text-sm mb-1">{name}</p>
              <p className="text-white font-mono text-lg">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// UUID 生成工具
function UuidTool() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(5);

  const generate = () => {
    const newUuids = [];
    for (let i = 0; i < count; i++) {
      newUuids.push(crypto.randomUUID());
    }
    setUuids(newUuids);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-white/60">生成数量:</label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
          min={1}
          max={100}
          className="w-20 px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10"
        />
        <button
          onClick={generate}
          className="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
        >
          生成
        </button>
        {uuids.length > 0 && (
          <button
            onClick={copyAll}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            复制全部
          </button>
        )}
      </div>

      {uuids.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 space-y-2">
          {uuids.map((uuid, i) => (
            <div key={i} className="flex items-center justify-between group">
              <code className="text-white/80 font-mono text-sm">{uuid}</code>
              <button
                onClick={() => navigator.clipboard.writeText(uuid)}
                className="opacity-0 group-hover:opacity-100 px-2 py-1 text-white/40 hover:text-white text-xs transition-opacity"
              >
                复制
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 随机密码工具
function PasswordTool() {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const generate = () => {
    let chars = '';
    if (options.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (options.numbers) chars += '0123456789';
    if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
      setPassword('请至少选择一种字符类型');
      return;
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    if (score <= 3) return { label: '弱', color: 'text-red-400' };
    if (score <= 5) return { label: '中', color: 'text-yellow-400' };
    return { label: '强', color: 'text-green-400' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-white/60 w-20">长度:</label>
        <input
          type="range"
          value={length}
          onChange={(e) => setLength(parseInt(e.target.value))}
          min={4}
          max={64}
          className="flex-1"
        />
        <span className="text-white w-8">{length}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'uppercase', label: '大写字母 A-Z' },
          { key: 'lowercase', label: '小写字母 a-z' },
          { key: 'numbers', label: '数字 0-9' },
          { key: 'symbols', label: '符号 !@#$...' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options[key as keyof typeof options]}
              onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-white/70 text-sm">{label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={generate}
        className="w-full py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 font-medium"
      >
        生成密码
      </button>

      {password && (
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <code className="text-white font-mono text-lg break-all">{password}</code>
            <button
              onClick={() => navigator.clipboard.writeText(password)}
              className="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 text-sm"
            >
              复制
            </button>
          </div>
          <p className={`text-sm ${getStrength(password).color}`}>
            强度: {getStrength(password).label}
          </p>
        </div>
      )}
    </div>
  );
}

// Hash 计算工具
function HashTool() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  const calculate = async () => {
    if (!input) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    const results: Record<string, string> = {};

    for (const alg of algorithms) {
      const hashBuffer = await crypto.subtle.digest(alg, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      results[alg] = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    setHashes(results);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/60 text-sm mb-2">输入文本</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入要计算 Hash 的文本..."
          className="w-full h-32 px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10 resize-none"
        />
      </div>

      <button
        onClick={calculate}
        className="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
      >
        计算 Hash
      </button>

      {Object.keys(hashes).length > 0 && (
        <div className="space-y-4">
          {Object.entries(hashes).map(([alg, hash]) => (
            <div key={alg} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/40 text-sm">{alg}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(hash)}
                  className="text-white/40 hover:text-white text-xs"
                >
                  复制
                </button>
              </div>
              <p className="text-white font-mono text-xs break-all">{hash}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 通用布局组件 ============

interface ToolLayoutProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  error?: string;
  buttons: { label: string; onClick: () => void }[];
  outputHeight?: string;
}

function ToolLayout({ input, setInput, output, error, buttons, outputHeight = 'h-48' }: ToolLayoutProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-white/60 text-sm mb-2">输入</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入内容..."
          className="w-full h-32 px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10 resize-none focus:border-white/20 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            {btn.label}
          </button>
        ))}
        <button
          onClick={() => navigator.clipboard.writeText(output)}
          disabled={!output}
          className="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 disabled:opacity-50"
        >
          复制结果
        </button>
        <button
          onClick={() => { setInput(''); }}
          className="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10"
        >
          清空
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-white/60 text-sm mb-2">输出</label>
        <textarea
          value={output}
          readOnly
          className={`w-full ${outputHeight} px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10 resize-none`}
        />
      </div>
    </div>
  );
}