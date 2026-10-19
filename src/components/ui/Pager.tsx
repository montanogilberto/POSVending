import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { fmtInt } from '../../utils/format';
import { pageWindow, type Page } from '../../utils/paging';
import './Pager.css';

interface PagerProps {
  page: Page<unknown>;
  onPage: (page: number) => void;
  /** Plural noun for "Mostrando 1–10 de 89 {noun}". */
  noun: string;
  emptyText: string;
}

/** "Mostrando x–y de n" + numbered page buttons (utils/paging.ts). */
const Pager: React.FC<PagerProps> = ({ page, onPage, noun, emptyText }) => (
  <div className="pager">
    <span>{page.total ? `Mostrando ${fmtInt(page.from)}–${fmtInt(page.to)} de ${fmtInt(page.total)} ${noun}` : emptyText}</span>
    {page.pageCount > 1 && (
      <div className="pager-pages">
        <IonButton fill="clear" size="small" disabled={page.page === 1} aria-label="Página anterior"
          onClick={() => onPage(page.page - 1)}><IonIcon slot="icon-only" icon={chevronBack} /></IonButton>
        {pageWindow(page.page, page.pageCount).map((p, i) => (p === '…'
          ? <span key={`gap-${i}`} className="pager-gap">…</span>
          : <IonButton key={p} size="small" fill={p === page.page ? 'solid' : 'clear'} onClick={() => onPage(p)}>{p}</IonButton>))}
        <IonButton fill="clear" size="small" disabled={page.page === page.pageCount} aria-label="Página siguiente"
          onClick={() => onPage(page.page + 1)}><IonIcon slot="icon-only" icon={chevronForward} /></IonButton>
      </div>
    )}
  </div>
);

export default Pager;
