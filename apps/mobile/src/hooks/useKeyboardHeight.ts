import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** Current on-screen keyboard height (0 when closed), for padding scroll content / modals so a
 * focused input is never hidden behind it. */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
