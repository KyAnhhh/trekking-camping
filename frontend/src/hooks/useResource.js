import { useCallback, useEffect, useState } from 'react';

export default function useResource(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: '' });
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (active) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            data: null,
            loading: false,
            error:
              error.response?.data?.message ||
              'Không thể tải dữ liệu. Kiểm tra kết nối và thử lại.',
          });
      });
    return () => {
      active = false;
    };
  }, [loader, revision]);
  return { ...state, reload };
}
