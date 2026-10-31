import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Check, Zap, Brain, Cpu, ShieldCheck } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export default function ModelSelector({ disabled = false, variant = 'composer' }) {
  const { models, selection, loading, changeModel } = useChat();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeModelId =
    selection.modelId ||
    models.find((m) => m.id === 'gemini-3.5-flash-lite')?.id ||
    models[0]?.id ||
    'gemini-3.5-flash-lite';

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const getModelDetails = (m) => {
    const id = m?.id || '';
    if (id.includes('flash-lite')) {
      return {
        shortName: 'Flash Lite',
        badge: '⚡ Siêu tốc',
        badgeClass: 'badge-fast',
        description: 'Phản hồi tức thì (<1s), tư vấn tour nhanh & chính xác',
        icon: Zap,
      };
    }
    if (id.includes('flash')) {
      return {
        shortName: 'Gemini Flash',
        badge: '🧠 Thông minh',
        badgeClass: 'badge-smart',
        description: 'Lập luận sâu, tối ưu cho việc lên kế hoạch & so sánh tour',
        icon: Brain,
      };
    }
    if (id.includes('31b')) {
      return {
        shortName: 'Gemma 31B',
        badge: '🔬 Phân tích',
        badgeClass: 'badge-deep',
        description: 'Mô hình mã nguồn mở thế hệ mới với độ chi tiết cao',
        icon: Cpu,
      };
    }
    return {
      shortName: m?.label || id,
      badge: '✨ Chuẩn',
      badgeClass: 'badge-standard',
      description: m?.description || 'Trợ lý AI hỗ trợ hành trình',
      icon: Sparkles,
    };
  };

  const currentDetails = getModelDetails(models.find((m) => m.id === activeModelId));
  const CurrentIcon = currentDetails.icon;

  const handleSelect = (modelId) => {
    changeModel(modelId);
    setOpen(false);
  };

  // Full card variant (used in forms like Planner or Admin)
  if (variant === 'card') {
    return (
      <div className="model-selector-card-wrap">
        <label className="field-label">
          <Sparkles size={15} className="sparkle-icon" />
          <span>Mô hình AI xử lý:</span>
        </label>
        <div className="model-selector-card" ref={dropdownRef}>
          <button
            type="button"
            className="model-card-trigger"
            disabled={disabled || loading}
            onClick={() => setOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <div className="model-card-info">
              <span className="model-icon-box">
                <CurrentIcon size={16} />
              </span>
              <div>
                <strong className="model-name">
                  {models.find((m) => m.id === activeModelId)?.label || currentDetails.shortName}
                </strong>
                <p className="model-desc">{currentDetails.description}</p>
              </div>
            </div>
            <div className="model-card-status">
              <span className={`model-tag ${currentDetails.badgeClass}`}>
                {currentDetails.badge}
              </span>
              <ChevronDown
                size={16}
                className={`model-chevron ${open ? 'model-chevron-up' : ''}`}
              />
            </div>
          </button>

          {open && (
            <div className="model-dropdown-menu model-dropdown-menu-wide" role="listbox">
              <div className="model-dropdown-header">
                <span>Chọn AI Model</span>
                <span className="status-dot-ready">
                  <ShieldCheck size={13} /> Sẵn sàng
                </span>
              </div>
              {models.map((m) => {
                const details = getModelDetails(m);
                const ItemIcon = details.icon;
                const isSelected = m.id === activeModelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`model-menu-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelect(m.id)}
                  >
                    <span className="model-item-icon">
                      <ItemIcon size={16} />
                    </span>
                    <div className="model-item-text">
                      <div className="model-item-title-row">
                        <strong>{m.label || details.shortName}</strong>
                        <span className={`model-tag ${details.badgeClass}`}>{details.badge}</span>
                      </div>
                      <p className="model-item-desc">{details.description}</p>
                    </div>
                    {isSelected && <Check size={16} className="model-check-icon" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Composer compact pill variant (used inside ChatPanel)
  return (
    <div className="chat-model-selector-custom" ref={dropdownRef}>
      <button
        type="button"
        className={`model-pill-trigger ${open ? 'active' : ''}`}
        disabled={disabled || loading}
        onClick={() => setOpen((prev) => !prev)}
        title="Chọn mô hình AI tư vấn"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="model-pill-sparkle">
          <CurrentIcon size={13} />
        </span>
        <span className="model-pill-label">{currentDetails.shortName}</span>
        <ChevronDown
          size={12}
          className={`model-pill-chevron ${open ? 'chevron-rotated' : ''}`}
        />
      </button>

      {open && (
        <div className="model-dropdown-menu" role="listbox">
          <div className="model-dropdown-header">
            <span>Mô hình AI</span>
            <span className="status-dot-ready">● Sẵn sàng</span>
          </div>
          <div className="model-dropdown-list">
            {models.map((m) => {
              const details = getModelDetails(m);
              const ItemIcon = details.icon;
              const isSelected = m.id === activeModelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`model-menu-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelect(m.id)}
                >
                  <span className="model-item-icon">
                    <ItemIcon size={14} />
                  </span>
                  <div className="model-item-text">
                    <div className="model-item-title-row">
                      <strong>{details.shortName}</strong>
                      <span className={`model-tag ${details.badgeClass}`}>{details.badge}</span>
                    </div>
                    <p className="model-item-desc">{details.description}</p>
                  </div>
                  {isSelected && <Check size={14} className="model-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
