import { LoaderCircle } from 'lucide-react';
export default function LoadingSpinner({ label = 'Đang tải...' }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>{label}</span>
    </div>
  );
}
