import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AISettings } from '../utils/ai'
import { getAISettings, saveAISettings } from '../utils/ai'

interface Props {
  open: boolean
  onClose: () => void
}

const PRESETS: { label: string; settings: Partial<AISettings> }[] = [
  { label: 'DeepSeek', settings: { provider: 'openai', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro' } },
  { label: 'OpenAI', settings: { provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' } },
  { label: 'Claude', settings: { provider: 'anthropic', baseUrl: '', model: 'claude-opus-4-8' } },
  { label: '自定义', settings: {} },
]

export default function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AISettings>(getAISettings())
  const [saved, setSaved] = useState(false)
  const [activePreset, setActivePreset] = useState('DeepSeek')

  function applyPreset(label: string, preset: Partial<AISettings>) {
    setActivePreset(label)
    if (Object.keys(preset).length > 0) {
      setSettings((s) => ({ ...s, ...preset }))
    }
  }

  function handleSave() {
    saveAISettings(settings)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-bg-elevated rounded-t-2xl sm:rounded-2xl p-6 border-t sm:border border-white/10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <h2 className="text-lg font-bold text-white mb-1">⚙️ AI 设置</h2>
            <p className="text-text-muted text-xs mb-5">配置后AI实时生成真实准确的旅行方案</p>

            {/* Presets */}
            <label className="block text-text-muted text-xs mb-1.5">快速选择</label>
            <div className="grid grid-cols-4 gap-1.5 mb-5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.label, p.settings)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    activePreset === p.label
                      ? 'bg-brand text-white'
                      : 'bg-bg-card text-text-muted hover:bg-bg-card-hover'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* API Key */}
            <label className="block text-text-muted text-xs mb-1.5">API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted/30 focus:outline-none focus:border-brand/40 mb-4"
            />

            {/* Model */}
            <label className="block text-text-muted text-xs mb-1.5">模型</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted/30 focus:outline-none focus:border-brand/40 mb-4"
            />

            {/* Base URL (only for OpenAI-compatible) */}
            {settings.provider === 'openai' && (
              <>
                <label className="block text-text-muted text-xs mb-1.5">API 地址</label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted/30 focus:outline-none focus:border-brand/40 mb-5"
                />
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-bg-card rounded-xl text-text-muted text-sm font-medium hover:bg-bg-card-hover transition-colors">
                取消
              </button>
              <button
                onClick={handleSave}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  saved ? 'bg-success text-white' : 'bg-gradient-to-r from-brand to-brand-light text-white'
                }`}
              >
                {saved ? '✅ 已保存' : '保存设置'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
