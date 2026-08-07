/**
 * usePopovers — cablea Header + AlertPopover + MailPopover en una línea.
 * Antes: ~25 líneas idénticas de popoverState/present/dismiss repetidas en
 * 20 páginas (~500 líneas en total).
 *
 * Uso:
 *   const pops = usePopovers();
 *   <Header screenTitle="…" {...pops.headerProps} />
 *   <AlertPopover {...pops.alertPopoverProps} />
 *   <MailPopover {...pops.mailPopoverProps} />
 */
import React, { useState } from 'react';

export function usePopovers() {
  const [state, setState] = useState<{ alert: boolean; mail: boolean; event?: Event }>({
    alert: false,
    mail: false,
  });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setState(s => ({ ...s, alert: true, event: e.nativeEvent }));
  const presentMailPopover = (e: React.MouseEvent) =>
    setState(s => ({ ...s, mail: true, event: e.nativeEvent }));

  return {
    headerProps: { presentAlertPopover, presentMailPopover },
    alertPopoverProps: {
      isOpen: state.alert,
      event: state.event,
      onDidDismiss: () => setState(s => ({ ...s, alert: false })),
    },
    mailPopoverProps: {
      isOpen: state.mail,
      event: state.event,
      onDidDismiss: () => setState(s => ({ ...s, mail: false })),
    },
  };
}
