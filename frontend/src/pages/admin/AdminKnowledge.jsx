import { useRef, useState } from 'react';
import { Upload, Trash2, FileText, BookOpen } from 'lucide-react';
import { adminService } from '../../api/adminService';
import useResource from '../../hooks/useResource';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { errorMessage } from '../../utils/tour';
const loadFiles = async () => (await adminService.getFiles()).data.data;
export default function AdminKnowledge() {
  const { data: files, loading, error: loadError, reload } = useResource(loadFiles);
  const [file, setFile] = useState(null),
    [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const input = useRef(null);
  const [publicExcerpt, setPublicExcerpt] = useState(false);
  async function syncTours() {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await adminService.syncTours();
      setSuccess(response.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function upload(event) {
    event.preventDefault();
    if (!file || busy) return;
    if (!file.name.toLowerCase().endsWith('.txt') || file.size === 0 || file.size > 1024 * 1024) {
      setError('Chọn tài liệu .txt có nội dung, dung lượng tối đa 1 MB.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminService.uploadFile(file, publicExcerpt);
      setSuccess('Đã cập nhật tài liệu vào kho tri thức.');
      setFile(null);
      setPublicExcerpt(false);
      input.current.value = '';
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await adminService.deleteFile(deleting);
      setSuccess('Đã xóa tài liệu khỏi kho tri thức.');
      setDeleting(null);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p className="eyebrow">TRỢ LÝ HÀNH TRÌNH</p>
          <h1>Kho tri thức</h1>
          <p className="muted">Quản lý nguồn tài liệu giúp trợ lý tư vấn những chuyến đi.</p>
        </div>
        <div className="heading-icon">
          <BookOpen />
        </div>
      </header>
      {error && !deleting && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notice notice-success" role="status">
          {success}
        </div>
      )}
      <section className="panel">
        <h2>Dữ liệu tour cho trợ lý</h2>
        <p className="muted">Sau khi nhập hoặc thay đổi tour, đồng bộ để cập nhật mô tả, lịch trình và trang bị. Chỉ tour đang hoạt động được nạp; tài liệu tour cũ được thay thế.</p>
        <button className="btn btn-outline" disabled={busy} onClick={syncTours}>
          {busy ? 'Đang xử lý...' : 'Đồng bộ tour cho AI'}
        </button>
        <p className="small muted">Danh sách bên dưới chỉ liệt kê file TXT đã upload. Giá và lịch còn chỗ được trợ lý đọc trực tiếp từ hệ thống.</p>
      </section>
      <div className="knowledge-layout">
        <section className="panel">
          <div className="list-toolbar">
            <h2>
              Tài liệu đã nạp <span className="count-pill">{files?.length ?? '—'}</span>
            </h2>
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : loadError ? (
            <EmptyState
              error
              title="Chưa tải được tài liệu"
              description={loadError}
              onRetry={reload}
            />
          ) : !files?.length ? (
            <EmptyState
              title="Chưa có tài liệu TXT"
              description="Tải lên tài liệu đầu tiên để bổ sung thông tin cho trợ lý."
            />
          ) : (
            <ul className="file-list">
              {files.map((name) => (
                <li key={name}>
                  <span className="file-icon">
                    <FileText size={22} />
                  </span>
                  <div>
                    <strong>{name}</strong>
                    <small>Tài liệu văn bản</small>
                  </div>
                  <button
                    className="icon-btn danger-text"
                    disabled={busy}
                    aria-label={'Xóa tài liệu ' + name}
                    onClick={() => {
                      setDeleting(name);
                      setError('');
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel upload-panel">
          <span className="heading-icon">
            <Upload />
          </span>
          <h2>Thêm tài liệu mới</h2>
          <p className="muted">Nội dung rõ ràng, chính xác giúp trợ lý trả lời tốt hơn.</p>
          <form onSubmit={upload} className="form-stack">
            <label className="file-picker">
              <FileText size={28} />
              <strong>{file?.name || 'Chọn tài liệu từ thiết bị'}</strong>
              <span>TXT · UTF-8 · Tối đa 1 MB</span>
              <input
                ref={input}
                type="file"
                accept=".txt,text/plain"
                disabled={busy}
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setPublicExcerpt(false);
                  setError('');
                }}
              />
            </label>
            <label><input type="checkbox" checked={publicExcerpt} disabled={busy} onChange={e => setPublicExcerpt(e.target.checked)} /> Cho phép khách xem tên tài liệu và đoạn trích nguồn</label>
            <p className="small muted">Chỉ nạp nội dung được phép dùng để tư vấn khách. Dù không bật xem đoạn trích, AI vẫn có thể diễn giải nội dung tài liệu. Nguồn đã gửi có thể được lưu trong lịch sử chat.</p>
            <button className="btn full-width" disabled={!file || busy}>
              <Upload size={17} />
              {busy ? 'Đang xử lý...' : 'Tải lên kho tri thức'}
            </button>
          </form>
          <p className="small muted">
            Bạn có thể thêm hướng dẫn chuẩn bị, mô tả cung đường và các câu hỏi thường gặp.
          </p>
        </section>
      </div>
      {deleting && (
        <Modal
          title="Xóa tài liệu?"
          onClose={() => {
            if (!busy) {
              setDeleting(null);
              setError('');
            }
          }}
        >
          <p>
            Tài liệu <strong className="break-word">{deleting}</strong> sẽ được xóa khỏi kho tri
            thức của trợ lý.
          </p>
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => {
                setDeleting(null);
                setError('');
              }}
            >
              Giữ lại
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={remove}>
              {busy ? 'Đang xóa...' : 'Xóa tài liệu'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
