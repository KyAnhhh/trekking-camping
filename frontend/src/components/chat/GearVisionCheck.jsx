import { useEffect, useId, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { aiVisionService } from '../../api/aiVisionService';
import { tourApi } from '../../api/tourService';
import { useLanguage } from '../../context/LanguageContext';
import { errorMessage } from '../../utils/tour';
import './gear-vision.css';

const MAX_RAW_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DIM_PX = 1024;

/**
 * Normalizes any browser-readable image (JPEG, PNG, WebP, etc.) into a clean JPEG <= 1024px
 * so mobile camera photos and WebP images upload fast and never exceed server limits.
 */
async function normalizeImageToJpeg(chosen) {
  const objectUrl = URL.createObjectURL(chosen);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) throw new Error('Invalid image dimensions');

    const scale = Math.max(srcW, srcH) > MAX_DIM_PX ? MAX_DIM_PX / Math.max(srcW, srcH) : 1;
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return chosen;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) return chosen;
    return new File([blob], 'gear-check.jpg', { type: 'image/jpeg' });
  } catch {
    return chosen;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function GearVisionCheck({
  tourId: fixedTourId = null,
  bookingId = null,
  tourTitle = '',
  compact = false,
  inModal = false,
  onAddChecklistItem = null,
  onVisionResult = null,
  onClose = null,
}) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const inputId = useId();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState(fixedTourId ? String(fixedTourId) : '');
  const [tours, setTours] = useState([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [addedKeys, setAddedKeys] = useState({});

  useEffect(() => {
    if (fixedTourId || bookingId) return;
    let active = true;
    tourApi
      .getAllTours()
      .then((res) => {
        if (active) setTours(res.data?.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fixedTourId, bookingId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelectFile = async (chosen) => {
    if (!chosen) return;
    if (chosen.type && !chosen.type.startsWith('image/')) {
      setError(
        isEn
          ? 'Please select an image file (JPEG, PNG, WebP).'
          : 'Vui lòng chọn tệp hình ảnh (JPEG, PNG, WebP).'
      );
      return;
    }
    if (chosen.size > MAX_RAW_BYTES) {
      setError(
        isEn ? 'Selected image is too large (max 12 MB).' : 'Ảnh gốc quá lớn (tối đa 12 MB).'
      );
      return;
    }

    setError('');
    setResult(null);
    const normalized = await normalizeImageToJpeg(chosen);
    if (normalized.size > MAX_UPLOAD_BYTES) {
      setError(
        isEn ? 'Image size must not exceed 5 MB.' : 'Dung lượng ảnh sau xử lý vượt quá 5 MB.'
      );
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(normalized);
    setPreviewUrl(URL.createObjectURL(normalized));
  };

  const submitCheck = async (event) => {
    event?.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await aiVisionService.checkGear({
        file,
        tourId: fixedTourId || (selectedTourId ? Number(selectedTourId) : null),
        bookingId,
        notes,
        language,
      });
      const data = res.data?.data;
      setResult(data);
      onVisionResult?.(data, previewUrl);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verdictMeta = (verdict) => {
    if (verdict === 'READY') {
      return {
        cls: 'verdict-ready',
        label: isEn ? 'Ready for Expedition' : 'Hành trang Sẵn sàng',
        Icon: CheckCircle2,
      };
    }
    if (verdict === 'NOT_SUITABLE') {
      return {
        cls: 'verdict-not_suitable',
        label: isEn ? 'Needs Major Gear Changes' : 'Chưa phù hợp địa hình',
        Icon: XCircle,
      };
    }
    return {
      cls: 'verdict-needs_improvement',
      label: isEn ? 'Needs Additional Items' : 'Cần bổ sung thêm đồ',
      Icon: AlertTriangle,
    };
  };

  const renderStatusIcon = (status) => {
    if (status === 'OK') return <CheckCircle2 size={17} className="gear-status-icon status-ok" />;
    if (status === 'INSUFFICIENT')
      return <XCircle size={17} className="gear-status-icon status-insufficient" />;
    return <AlertTriangle size={17} className="gear-status-icon status-warning" />;
  };

  const handleAddChecklist = async (itemText) => {
    if (!onAddChecklistItem || addedKeys[itemText]) return;
    await onAddChecklistItem(itemText);
    setAddedKeys((prev) => ({ ...prev, [itemText]: true }));
  };

  return (
    <section
      className={`gear-vision-card ${compact ? 'is-compact' : ''} ${inModal ? 'is-in-modal' : ''}`}
      aria-label="AI Gear Vision Check"
    >
      {!inModal ? (
        <div className="gear-vision-header">
          <div>
            <h3>
              <Camera size={18} />
              {isEn ? 'AI Gear Vision Check' : 'AI Kiểm tra Hành trang qua Ảnh'}
            </h3>
            <p className="small muted" style={{ margin: 0 }}>
              {tourTitle
                ? isEn
                  ? `Inspect your packed gear against "${tourTitle}" requirements.`
                  : `Chụp ảnh balo, giày hoặc đồ cắm trại để AI đối chiếu với tour "${tourTitle}".`
                : isEn
                  ? 'Upload a photo of your trekking gear or footwear for AI safety & readiness inspection.'
                  : 'Tải lên ảnh giày trekking, balo hoặc lều trại để AI đánh giá độ phù hợp & liệt kê món còn thiếu.'}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label={isEn ? 'Close gear vision panel' : 'Đóng kiểm tra ảnh'}
            >
              <X size={18} />
            </button>
          )}
        </div>
      ) : (
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          {isEn
            ? 'Upload a photo of your trekking gear, footwear or backpack for AI safety & readiness inspection.'
            : 'Tải lên ảnh giày trekking, balo hoặc lều trại để AI đánh giá độ phù hợp & liệt kê món còn thiếu.'}
        </p>
      )}

      <form onSubmit={submitCheck}>
        <label
          htmlFor={inputId}
          className={`gear-vision-dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleSelectFile(e.dataTransfer.files?.[0]);
          }}
        >
          {previewUrl ? (
            <div className="gear-vision-preview-wrap">
              <img src={previewUrl} alt={isEn ? 'Gear preview' : 'Xem trước ảnh hành trang'} />
            </div>
          ) : (
            <>
              <Upload size={26} />
              <strong>
                {isEn
                  ? 'Drop gear photo here or click to choose'
                  : 'Kéo thả ảnh hành trang vào đây hoặc bấm để chọn'}
              </strong>
              <span className="small muted">JPEG / PNG / WebP · {isEn ? 'Auto-optimized' : 'Tự động tối ưu dung lượng'}</span>
            </>
          )}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
          />
        </label>

        <div className="gear-vision-controls">
          {!fixedTourId && !bookingId && tours.length > 0 && (
            <label className="field">
              {isEn ? 'Compare against expedition (optional)' : 'Đối chiếu theo tour (tùy chọn)'}
              <select
                value={selectedTourId}
                onChange={(e) => setSelectedTourId(e.target.value)}
                disabled={busy}
              >
                <option value="">
                  {isEn ? 'General Mountain Trekking & Camping' : 'Chuẩn Trekking & Cắm trại chung'}
                </option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.durationDays}N)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            {isEn ? 'Specific question for AI (optional)' : 'Ghi chú / câu hỏi cho AI (tùy chọn)'}
            <input
              maxLength={600}
              value={notes}
              disabled={busy}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isEn
                  ? 'e.g. Are these boots grippy enough for rainy trails?'
                  : 'VD: Đôi giày này đi cung Tà Năng mùa mưa có ổn không?'
              }
            />
          </label>

          {error && (
            <p className="notice notice-error" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}

          <div className="gear-vision-actions">
            <button type="submit" className="btn" disabled={!file || busy}>
              <Sparkles size={16} />
              {busy
                ? isEn
                  ? 'AI is inspecting gear...'
                  : 'AI đang phân tích ảnh...'
                : isEn
                  ? 'Analyze Gear Photo'
                  : 'Phân tích hành trang bằng AI'}
            </button>
            {file && !busy && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl('');
                  setResult(null);
                  setError('');
                }}
              >
                {isEn ? 'Clear photo' : 'Chọn ảnh khác'}
              </button>
            )}
          </div>
        </div>
      </form>

      {result && (
        <div className="gear-vision-result" role="region" aria-live="polite">
          {(() => {
            const meta = verdictMeta(result.verdict);
            const VerdictIcon = meta.Icon;
            return (
              <div className={`gear-verdict-banner ${meta.cls}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <VerdictIcon size={20} />
                  <div>
                    <strong>{meta.label}</strong>
                    {result.tourTitle && <div className="small">{result.tourTitle}</div>}
                  </div>
                </div>
                <span className="gear-score-pill">{result.readinessScore}/100%</span>
              </div>
            );
          })()}

          <p style={{ margin: 0, lineHeight: 1.5 }}>{result.summary}</p>

          {result.detectedItems?.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
                {isEn ? 'Detected items in photo' : 'Trang bị nhận diện được trong ảnh'}
              </h4>
              <ul className="gear-detected-list">
                {result.detectedItems.map((item, idx) => (
                  <li className="gear-detected-item" key={idx}>
                    {renderStatusIcon(item.status)}
                    <div>
                      <strong>{item.name}</strong>
                      {item.note && <div className="small muted">{item.note}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.missingItems?.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem' }}>
                {isEn ? 'Important items still missing' : 'Vật dụng quan trọng nên bổ sung'}
              </h4>
              <ul className="gear-missing-list">
                {result.missingItems.map((item, idx) => (
                  <li className="gear-missing-item" key={idx}>
                    <span>{item}</span>
                    {onAddChecklistItem && (
                      <button
                        type="button"
                        className="text-btn"
                        disabled={addedKeys[item]}
                        onClick={() => handleAddChecklist(item)}
                      >
                        <Plus size={14} />
                        {addedKeys[item]
                          ? isEn
                            ? 'Added'
                            : 'Đã thêm'
                          : isEn
                            ? 'Add to checklist'
                            : 'Thêm vào checklist'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.safetyAdvice?.length > 0 && (
            <div>
              <h4
                style={{
                  margin: '0 0 6px',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={15} />
                {isEn ? 'Field safety tips' : 'Lưu ý an toàn thực địa'}
              </h4>
              <ul className="gear-advice-list">
                {result.safetyAdvice.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
