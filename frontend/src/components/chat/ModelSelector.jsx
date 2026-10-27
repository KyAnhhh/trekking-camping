import { useChat } from '../../context/ChatContext';

export default function ModelSelector({ disabled = false }) {
  const { models, selection, loading, changeModel } = useChat();
  const shortName = m => {
    if (m.id === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Flash Lite (Mặc định · Siêu nhanh)';
    if (m.id === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
    if (m.id === 'gemma-4-31b-it') return 'Gemma 31B';
    if (m.id === 'gemma-4-26b-a4b-it') return 'Gemma 26B';
    return m.label || m.id;
  };
  const activeModelId = selection.modelId || models.find(m => m.id === 'gemini-3.5-flash-lite')?.id || models[0]?.id || '';
  return <label className="chat-model-selector">
    <span className="sr-only">Chọn model AI</span>
    <select aria-label="Chọn model AI" title={models.find(m => m.id === activeModelId)?.label || 'Chọn model'}
      value={activeModelId} disabled={disabled || loading || !models.length} onChange={e => changeModel(e.target.value)}>
      {!activeModelId && <option value="" disabled>Chọn AI</option>}
      {activeModelId && !models.some(m => m.id === activeModelId) && <option value={activeModelId} disabled>AI đã tắt</option>}
      {models.map(m => <option key={m.id} value={m.id} title={m.label}>{shortName(m)}</option>)}
    </select>
  </label>;
}
