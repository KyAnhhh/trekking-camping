import { useContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { errorMessage } from '../../utils/tour';
import './favorites.css';

export default function FavoriteButton({ tour }) {
  const { user } = useContext(AuthContext);
  const favorites = useFavorites();
  const navigate = useNavigate(), location = useLocation();
  const [error, setError] = useState('');
  const saved = favorites.ids.includes(tour.id);
  const click = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
    setError('');
    try { await favorites.toggle(tour.id); } catch (e) { setError(errorMessage(e)); }
  };
  return <div className="favorite-control">
    <button type="button" className="favorite-button" aria-pressed={saved}
      aria-label={`${saved ? 'Bỏ lưu' : 'Lưu tour'} ${tour.title}`}
      disabled={favorites.loading || favorites.pending.includes(tour.id) || !!favorites.error} onClick={click}>
      <Heart size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      {saved ? 'Đã yêu thích' : 'Yêu thích'}
    </button>
    {favorites.error && <button type="button" className="favorite-button" onClick={favorites.retry}>Tải lại trạng thái yêu thích</button>}
    {(error || favorites.error) && <small role="alert">{error || favorites.error}</small>}
  </div>;
}
