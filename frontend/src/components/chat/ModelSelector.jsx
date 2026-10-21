import { useChat } from '../../context/ChatContext';

export default function ModelSelector({ disabled = false }) {
  const { models, selection, loading, changeModel } = useChat();
  const shortName = m => m.id === 'gemma-4-31b-it' ? 'Gemma 31B' : m.id === 'gemma-4-26b-a4b-it' ? 'Gemma 26B' : m.label;
  return <label className="chat-model-selector">
    <span className="sr-only">Chọn model AI</span>
    <select aria-label="Chọn model AI" title={models.find(m => m.id === selection.modelId)?.label || 'Chọn model trước khi gửi'}
      value={selection.modelId || ''} disabled={disabled || loading || !models.length} onChange={e => changeModel(e.target.value)}>
      <option value="" disabled>Chọn AI</option>
      {selection.modelId && !models.some(m => m.id === selection.modelId) && <option value={selection.modelId} disabled>AI đã tắt</option>}
      {models.map(m => <option key={m.id} value={m.id} title={m.label}>{shortName(m)}</option>)}
    </select>
  </label>;
}
