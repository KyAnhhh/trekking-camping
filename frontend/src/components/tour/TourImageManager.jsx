import { useCallback, useRef, useState } from "react";
import { tourApi } from "../../api/tourService";
import useResource from "../../hooks/useResource";
import { mediaUrl, errorMessage } from "../../utils/tour";
import LoadingSpinner from "../common/LoadingSpinner";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";

export default function TourImageManager({ tourId, onChanged }) {
  const loader = useCallback(
    async () => (await tourApi.getImages(tourId)).data.data,
    [tourId],
  );
  const {
    data: images,
    loading,
    error: loadError,
    reload,
  } = useResource(loader);
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  const input = useRef(null);
  const action = async (operation) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
      setRemoving(null);
      reload();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const upload = (event) => {
    event.preventDefault();
    if (
      !file ||
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPEG hoặc PNG, tối đa 5 MB.");
      return;
    }
    action(async () => {
      await tourApi.uploadImage(tourId, file);
      setFile(null);
      if (input.current) input.current.value = "";
    });
  };
  return (
    <section className="panel image-manager">
      <h2>Ảnh chuyến đi</h2>
      <p className="muted">
        Tối đa 20 ảnh JPEG/PNG, 5 MB và 16 megapixel mỗi ảnh. Ảnh đầu tiên tự
        làm ảnh bìa.
      </p>
      {error && !removing && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <form className="form-stack tour-image-form" onSubmit={upload}>
        <label className="field">
          Chọn ảnh
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError("");
            }}
          />
        </label>
        <button className="btn" disabled={busy || !file}>
          {busy ? "Đang xử lý..." : "Upload ảnh"}
        </button>
      </form>
      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <EmptyState
          error
          title="Chưa tải được ảnh"
          description={loadError}
          onRetry={reload}
        />
      ) : !images?.length ? (
        <p className="muted">Tour chưa có ảnh. Hãy tải lên ảnh đầu tiên.</p>
      ) : (
        <div className="tour-photo-grid">
          {images.map((photo) => (
            <article key={photo.id}>
              <img
                src={mediaUrl(photo.imageUrl)}
                alt={photo.isCover ? "Ảnh bìa tour" : "Ảnh tour"}
                loading="lazy"
              />
              <div className="photo-actions">
                {photo.isCover ? (
                  <span className="status-badge">Ảnh bìa</span>
                ) : (
                  <button
                    className="btn btn-outline btn-small"
                    disabled={busy}
                    onClick={() =>
                      action(() => tourApi.setCover(tourId, photo.id))
                    }
                  >
                    Đặt làm ảnh bìa
                  </button>
                )}
                <button
                  className="btn btn-outline btn-small"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setRemoving(photo);
                  }}
                >
                  Xóa ảnh
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {removing && (
        <Modal
          title="Xóa ảnh khỏi tour?"
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
        >
          <p>
            Ảnh sẽ được gỡ khỏi website. Nếu đây là ảnh bìa, hệ thống sẽ chọn
            ảnh còn lại.
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
              onClick={() => setRemoving(null)}
            >
              Giữ lại
            </button>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() =>
                action(() => tourApi.deleteImage(tourId, removing.id))
              }
            >
              Xác nhận xóa
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
