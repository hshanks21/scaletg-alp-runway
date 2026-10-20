import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Standard dialog open/close transition — see DESIGN.md §Motion.
 *
 * Dialogs are conditionally rendered, so to animate the exit they stay
 * mounted through a `closing` state and unmount only after the exit
 * animation finishes. Pair with the shared `.runway-backdrop` /
 * `.runway-dialog` classes (and `.is-closing` when `closing` is true).
 *
 *   const { closing, requestClose } = useDialogTransition(onClose);
 *
 *   <div className={`runway-backdrop${closing ? ' is-closing' : ''}`} onClick={...requestClose}>
 *     <div className={`runway-dialog${closing ? ' is-closing' : ''}`}>…</div>
 *   </div>
 */
export function useDialogTransition(onClose: () => void, duration = 150) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timer = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    timer.current = window.setTimeout(() => onCloseRef.current(), duration);
  }, [duration]);

  return { closing, requestClose };
}
