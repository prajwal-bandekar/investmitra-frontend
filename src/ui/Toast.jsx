import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

/** One toast at a time, bottom-centre, in the paper's voice. */
export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  const timer = useRef();

  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 3600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div className="toast-wrap toast-wrap--app" role="status">
          <div className="toast">{message}</div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
