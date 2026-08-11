import { useReduceMotionContext } from '../context/ReduceMotionContext';

/** Ergonomic re-export — `const reduceMotion = useReduceMotion()`, mirrors useTimeTheme()/useHaptics(). */
export function useReduceMotion(): boolean {
  return useReduceMotionContext().reduceMotion;
}
