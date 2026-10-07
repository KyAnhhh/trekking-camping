import { Compass, RefreshCw } from 'lucide-react';
export default function EmptyState({
  title = 'Chưa có dữ liệu',
  description,
  error = false,
  onRetry,
  children,
}) {
  return (
    <div className={'empty-state' + (error ? ' is-error' : '')} role={error ? 'alert' : 'status'}>
      <Compass size={32} strokeWidth={1.4} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry}>
          <RefreshCw size={16} />
          Thử lại
        </button>
      )}
      {children}
    </div>
  );
}
