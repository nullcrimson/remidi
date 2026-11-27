import { useEffect } from 'react';
import { TipToast } from './TipToast';
import { closeTipAsk, useTipAsked } from './tipNote';

/**
 * The converter's one tip ask, shown while a download has raised it. Closing it gives focus
 * back to the element that raised it when focus was inside the ask; leaving the view takes it
 * off the screen.
 */
export function ConverterTip() {
  const asked = useTipAsked();
  useEffect(() => closeTipAsk, []);
  if (asked === null) return null;
  return (
    <TipToast
      onClose={(hadFocus) => {
        closeTipAsk();
        if (hadFocus && asked.opener?.isConnected) asked.opener.focus();
      }}
    />
  );
}
