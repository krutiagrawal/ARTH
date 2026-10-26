import { useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';

/**
 * True while the calling screen is the focused one. Stack screens stay mounted underneath the one
 * on top, so a polling query (`refetchInterval`) keeps hitting the API for screens nobody is
 * looking at; gate the interval on this to stop that. Outside a navigator it is always true, so
 * hooks using it also work in plain components.
 */
export function useIsScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => (navigation ? navigation.isFocused() : true));

  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return focused;
}
