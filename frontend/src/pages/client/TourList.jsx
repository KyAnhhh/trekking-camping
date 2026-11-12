import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { tourApi } from '../../api/tourService';
import useResource from '../../hooks/useResource';
import TourCard from '../../components/tour/TourCard';
import TourFilter from '../../components/tour/TourFilter';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Reveal from '../../components/common/Reveal';
import { useLanguage } from '../../context/LanguageContext';
import '../../components/chat/gear-vision.css';

const loadTours = async () => (await tourApi.getAllTours()).data.data;

const SEMANTIC_EXAMPLES_VI = [
  'Săn mây nhẹ nhàng cuối tuần cho người mới',
  'Rừng rêu ma mị mát mẻ',
  'Chinh phục đỉnh cao mạo hiểm 3 ngày',
];

const SEMANTIC_EXAMPLES_EN = [
  'Easy cloud-hunting weekend trek for beginners',
  'Mossy forest camping adventure',
  'Challenging summit expedition',
];

export default function TourList() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const { data, loading, error, reload } = useResource(loadTours, {
    key: 'tours',
    ttl: 300000,
    persist: true,
  });

  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '',
    difficulty = params.get('difficulty') || '',
    length = params.get('duration') || '',
    sort = params.get('sort') || '',
    mode = params.get('mode') || 'semantic';

  const semanticMode = mode !== 'keyword';

  const [semanticResults, setSemanticResults] = useState(null);
  const [semanticBusy, setSemanticBusy] = useState(false);

  const change = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };

  const toggleSemantic = () => {
    const next = new URLSearchParams(params);
    if (semanticMode) {
      next.set('mode', 'keyword');
    } else {
      next.delete('mode');
    }
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!semanticMode || trimmed.length < 2) {
      setSemanticResults(null);
      setSemanticBusy(false);
      return;
    }

    const controller = new AbortController();
    setSemanticBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await tourApi.semanticSearch({
          q: trimmed,
          difficulty,
          duration: length,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSemanticResults(res.data.data || []);
        }
      } catch (err) {
        if (!controller.signal.aborted && err?.name !== 'CanceledError') {
          setSemanticResults(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSemanticBusy(false);
        }
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, difficulty, length, semanticMode]);

  const keywordTours = (data || []).filter(
    (tour) =>
      (!difficulty || String(tour.difficultyLevel) === difficulty) &&
      (!query ||
        ((tour.title || '') + ' ' + (tour.location || '') + ' ' + (tour.summary || ''))
          .toLocaleLowerCase('vi')
          .includes(query.trim().toLocaleLowerCase('vi'))) &&
      (!length || (length === 'short' ? tour.durationDays <= 2 : tour.durationDays >= 3)),
  );

  const activeEntries =
    semanticMode && query.trim().length >= 2 && semanticResults !== null
      ? semanticResults.map((item) => ({ tour: item.tour, aiMatch: item }))
      : keywordTours.map((tour) => ({ tour, aiMatch: null }));

  const sortedEntries = [...activeEntries];
  if (sort) {
    sortedEntries.sort((a, b) =>
      sort === 'price-asc'
        ? a.tour.pricePerPax - b.tour.pricePerPax
        : b.tour.pricePerPax - a.tour.pricePerPax,
    );
  }

  const examples = isEn ? SEMANTIC_EXAMPLES_EN : SEMANTIC_EXAMPLES_VI;

  return (
    <div className="container page-space">
      <header className="page-heading">
        <p className="eyebrow">{isEn ? 'EXPLORE WITH TREK & CAMP' : 'KHÁM PHÁ CÙNG TREK & CAMP'}</p>
        <h1>{isEn ? 'Find your wilderness trail.' : 'Tìm cung đường của bạn.'}</h1>
        <p>
          {isEn
            ? 'From first footsteps to lofty summits — describe what you feel like experiencing, and our AI semantic engine finds the best match.'
            : 'Từ bước chân đầu tiên đến những đỉnh cao mới — nhập mô tả tự nhiên để AI tìm cung đường sát nhất với ý định của bạn.'}
        </p>
      </header>

      <TourFilter
        query={query}
        difficulty={difficulty}
        length={length}
        sort={sort}
        semanticMode={semanticMode}
        onToggleSemantic={toggleSemantic}
        onChange={change}
        onReset={() => setParams({})}
      />

      {semanticMode && (
        <div className="semantic-hints-bar">
          <span className="semantic-hints-label">
            <Sparkles size={13} />
            {isEn ? 'Try AI semantic queries:' : 'Thử tìm theo ý định:'}
          </span>
          <div className="semantic-hints-chips">
            {examples.map((sample) => (
              <button
                key={sample}
                type="button"
                className="semantic-hint-chip"
                onClick={() => change('q', sample)}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}

      {(loading && !data) || (semanticBusy && semanticResults === null) ? (
        <LoadingSpinner
          label={
            semanticBusy
              ? isEn
                ? 'Running AI semantic tour matching...'
                : 'Đang phân tích ngữ nghĩa & xếp hạng tour phù hợp...'
              : isEn
                ? 'Loading expeditions...'
                : 'Đang tải danh sách tour...'
          }
        />
      ) : error ? (
        <EmptyState
          error
          title={isEn ? 'Unable to load expeditions' : 'Chưa tải được tour'}
          description={error}
          onRetry={reload}
        />
      ) : (
        <Reveal>
          {sortedEntries.length ? (
            <>
              {semanticMode && query.trim().length >= 2 && semanticResults !== null && (
                <p className="semantic-result-banner">
                  <Sparkles size={15} />
                  {isEn
                    ? `AI Semantic Search ranked ${sortedEntries.length} matching expedition(s) for “${query.trim()}”.`
                    : `Tìm kiếm Ngữ nghĩa AI đã xếp hạng ${sortedEntries.length} cung đường phù hợp với “${query.trim()}”.`}
                </p>
              )}
              <div className="tour-grid" aria-label={isEn ? 'Tour catalog' : 'Danh sách tour'}>
                {sortedEntries.map(({ tour, aiMatch }) => (
                  <TourCard key={tour.id} tour={tour} aiMatch={aiMatch} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title={isEn ? 'No expeditions match your criteria' : 'Không có chuyến đi phù hợp'}
              description={
                isEn
                  ? 'Try relaxing your filters or search keywords, or ask our trail assistant.'
                  : 'Thử bỏ bớt bộ lọc hoặc đổi mô tả tìm kiếm để khám phá thêm.'
              }
            >
              <button className="btn btn-outline" onClick={() => setParams({})}>
                {isEn ? 'Clear all filters' : 'Xóa bộ lọc'}
              </button>
            </EmptyState>
          )}
        </Reveal>
      )}

      <Reveal className="container ai-banner">
        <div>
          <p className="eyebrow">{isEn ? 'TRAIL ASSISTANT' : 'TRỢ LÝ HÀNH TRÌNH'}</p>
          <h2>{isEn ? 'Need help picking your trail?' : 'Chưa chắc chuyến đi nào phù hợp?'}</h2>
          <p>
            {isEn
              ? 'Tell us about your outdoor experience, available days, and physical endurance.'
              : 'Nêu thời gian dự kiến và kinh nghiệm trekking để trợ lý gợi ý hành trình sát nhất.'}
          </p>
        </div>
        <Link className="btn btn-lime" to="/chat">
          {isEn ? 'Ask AI Assistant' : 'Hỏi trợ lý'} <ArrowUpRight size={18} />
        </Link>
      </Reveal>
    </div>
  );
}
