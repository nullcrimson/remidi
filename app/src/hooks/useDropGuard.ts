import { useEffect } from 'react';

/** Stops the browser from opening a file dropped outside a drop zone, which would leave the app. */
export function useDropGuard() {
  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);
}
