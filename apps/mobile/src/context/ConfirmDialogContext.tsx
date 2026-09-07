import React, { createContext, useCallback, useContext, useState } from 'react';
import { ConfirmDialog, ConfirmButton } from '../components/common/ConfirmDialog';

/**
 * Drop-in themed replacement for `Alert.alert(title, message, buttons)` — same call shape,
 * so existing call sites convert by swapping the import and function name. Renders through
 * ConfirmDialog (built on the shared Sheet) instead of the OS's unstyled native alert.
 */

interface ConfirmDialogContextValue {
  confirm: (title: string, message?: string, buttons?: ConfirmButton[]) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue>({
  confirm: () => {},
});

const DEFAULT_BUTTONS: ConfirmButton[] = [{ text: 'OK', style: 'default' }];

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [buttons, setButtons] = useState<ConfirmButton[]>(DEFAULT_BUTTONS);

  const confirm = useCallback(
    (nextTitle: string, nextMessage?: string, nextButtons: ConfirmButton[] = DEFAULT_BUTTONS) => {
      setTitle(nextTitle);
      setMessage(nextMessage);
      setButtons(nextButtons);
      setVisible(true);
    },
    []
  );

  const onClose = useCallback(() => setVisible(false), []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog visible={visible} onClose={onClose} title={title} message={message} buttons={buttons} />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmDialogContext).confirm;
}
