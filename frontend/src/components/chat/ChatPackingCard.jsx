import { useState, useEffect, useMemo } from 'react';
import {
  Backpack,
  CheckSquare,
  Square,
  Shirt,
  Footprints,
  Tent,
  Droplets,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  BookmarkCheck,
} from 'lucide-react';
import './chat-packing.css';

const CATEGORY_ICONS = {
  CLOTHING: Shirt,
  FOOTWEAR: Footprints,
  CAMPING: Tent,
  NUTRITION: Droplets,
  SAFETY: ShieldAlert,
};

export default function ChatPackingCard({ data }) {
  if (!data || !data.categories || data.categories.length === 0) return null;

  const storageKey = useMemo(() => {
    const slug = (data.destination || 'trekking')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    return `tc_pack_${slug}`;
  }, [data.destination]);

  // Load initial checked state from localStorage
  const [checkedMap, setCheckedMap] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState('ALL');
  const [toast, setToast] = useState('');
  const [rentToast, setRentToast] = useState('');

  // Persist checked items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedMap));
    } catch (e) {
      /* ignore quota errors */
    }
  }, [checkedMap, storageKey]);

  // Flatten all items across all categories
  const allItems = useMemo(() => {
    return data.categories.flatMap((cat) =>
      cat.items.map((item) => ({ ...item, categoryKey: cat.key, categoryName: cat.name }))
    );
  }, [data.categories]);

  // Compute live statistics
  const totalCount = allItems.length;
  const checkedCount = allItems.filter((i) => checkedMap[i.id]).length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Items to display based on active tab
  const displayedItems = useMemo(() => {
    if (activeTab === 'ALL') return allItems;
    return allItems.filter((i) => i.categoryKey === activeTab);
  }, [allItems, activeTab]);

  function toggleItem(id) {
    setCheckedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleCheckAll() {
    const next = {};
    allItems.forEach((i) => (next[i.id] = true));
    setCheckedMap(next);
  }

  function handleReset() {
    setCheckedMap({});
  }

  function handleCopyChecklist() {
    let text = `🎒 ${data.title || 'CHECKLIST HÀNH TRANG TREKKING'}\n`;
    text += `📍 Điểm đến: ${data.destination || 'Trekking dã ngoại'}\n`;
    if (data.seasonNotice) text += `⛅ Thời tiết: ${data.seasonNotice}\n`;
    if (data.temperatureRange) text += `🌡️ Nhiệt độ: ${data.temperatureRange}\n`;
    if (data.terrainNotice) text += `🏔️ Địa hình: ${data.terrainNotice}\n\n`;

    data.categories.forEach((cat) => {
      text += `--- ${cat.name.toUpperCase()} ---\n`;
      cat.items.forEach((item) => {
        const mark = checkedMap[item.id] ? '[x]' : '[ ]';
        const req = item.isRequired ? ' (Bắt buộc)' : '';
        const rent = item.canRent && item.rentalPrice ? ` [Thuê: ${item.rentalPrice.toLocaleString('vi-VN')} đ]` : '';
        text += `${mark} ${item.name}${req}${rent}\n   -> ${item.desc}\n`;
      });
      text += '\n';
    });

    text += `\n*Xuất từ Hệ thống Trekking & Camping AI Companion*`;

    navigator.clipboard?.writeText(text);
    setToast('Đã sao chép checklist vào bộ nhớ tạm!');
    setTimeout(() => setToast(''), 3000);
  }

  function handleSaveProfile() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedMap));
      setToast('Đã lưu tiến độ chuẩn bị vào hồ sơ cá nhân!');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setToast('Không thể lưu vào bộ nhớ trình duyệt.');
      setTimeout(() => setToast(''), 3000);
    }
  }

  function handleRentClick(e, item) {
    e.stopPropagation();
    setRentToast(`Đã ghi nhận nhu cầu thuê: "${item.name}". Hệ thống sẽ đưa vào bước thanh toán add-on.`);
    setTimeout(() => setRentToast(''), 4000);
  }

  return (
    <div className="chat-packing-card" role="region" aria-label="Bảng hành trang chuẩn bị">
      {/* Header Banner */}
      <div className="chat-packing-header">
        <div className="chat-packing-title-row">
          <div className="chat-packing-title-group">
            <span className="chat-packing-icon-badge">
              <Backpack size={20} />
            </span>
            <div>
              <h3 className="chat-packing-title">{data.title}</h3>
              <div className="chat-packing-meta-pills">
                {data.seasonNotice && (
                  <span className="chat-packing-pill weather">
                    <span>⛅</span> {data.seasonNotice}
                  </span>
                )}
                {data.temperatureRange && (
                  <span className="chat-packing-pill">
                    <span>🌡️</span> {data.temperatureRange}
                  </span>
                )}
                {data.terrainNotice && (
                  <span className="chat-packing-pill">
                    <span>🏔️</span> {data.terrainNotice}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="chat-packing-standard-badge">Chuẩn UIAA & LNT</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="chat-packing-progress-section">
        <div className="chat-packing-progress-info">
          <span className="chat-packing-progress-label">Tiến độ chuẩn bị trang bị của bạn:</span>
          <span className="chat-packing-progress-val">
            {checkedCount} / {totalCount} món ({progressPct}%)
          </span>
        </div>
        <div className="chat-packing-track">
          <div className="chat-packing-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="chat-packing-tabs">
        <button
          type="button"
          className={`chat-packing-tab ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          Tất cả ({totalCount})
        </button>
        {data.categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.key] || Backpack;
          const catChecked = cat.items.filter((i) => checkedMap[i.id]).length;
          return (
            <button
              key={cat.key}
              type="button"
              className={`chat-packing-tab ${activeTab === cat.key ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.key)}
            >
              <Icon size={12} style={{ display: 'inline', marginRight: 4 }} />
              {cat.name.split(' (')[0]} ({catChecked}/{cat.items.length})
            </button>
          );
        })}
      </div>

      {/* Notification Toast */}
      {toast && (
        <div className="px-4 py-2 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20 flex items-center gap-1.5 transition-all">
          <Check size={14} />
          <span>{toast}</span>
        </div>
      )}

      {rentToast && (
        <div className="px-4 py-2 text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-b border-blue-500/20 flex items-center gap-1.5 transition-all">
          <ShoppingBag size={14} />
          <span>{rentToast}</span>
        </div>
      )}

      {/* Items List */}
      <div className="chat-packing-items-list">
        {displayedItems.map((item) => {
          const isChecked = !!checkedMap[item.id];
          return (
            <div
              key={item.id}
              className={`chat-packing-item-row ${isChecked ? 'checked' : ''}`}
              onClick={() => toggleItem(item.id)}
            >
              <div className="chat-packing-item-left">
                <span className="chat-packing-checkbox" aria-hidden="true">
                  {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                </span>
                <div className="chat-packing-item-content">
                  <span className="chat-packing-item-name">{item.name}</span>
                  {item.desc && <span className="chat-packing-item-desc">{item.desc}</span>}
                </div>
              </div>

              <div className="chat-packing-item-right">
                {item.isRequired ? (
                  <span className="chat-packing-req-badge">Bắt buộc</span>
                ) : (
                  <span className="chat-packing-req-badge optional">Gợi ý</span>
                )}

                {item.canRent && item.rentalPrice > 0 && (
                  <button
                    type="button"
                    className="chat-packing-rent-btn"
                    title="Đăng ký thuê trang bị này cho chuyến đi"
                    onClick={(e) => handleRentClick(e, item)}
                  >
                    Thuê {item.rentalPrice.toLocaleString('vi-VN')} đ
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Action Bar */}
      <div className="chat-packing-footer">
        <div className="chat-packing-action-left">
          <button
            type="button"
            className="chat-packing-btn-subtle"
            onClick={progressPct === 100 ? handleReset : handleCheckAll}
          >
            <RotateCcw size={12} />
            <span>{progressPct === 100 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
          </button>
        </div>

        <div className="chat-packing-action-right">
          <button
            type="button"
            className="chat-packing-btn-subtle"
            onClick={handleCopyChecklist}
            title="Sao chép toàn bộ checklist sang clipboard"
          >
            <Copy size={13} />
            <span>Sao chép checklist</span>
          </button>

          <button
            type="button"
            className="chat-packing-btn-primary"
            onClick={handleSaveProfile}
          >
            <BookmarkCheck size={14} />
            <span>Lưu vào hồ sơ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
