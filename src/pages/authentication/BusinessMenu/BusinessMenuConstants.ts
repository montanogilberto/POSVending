/** Same cap as the agent (agents/business_menu/extract.py MAX_FILE_BYTES). */
export const MAX_MENU_FILE_BYTES = 8_000_000;

/** What the file picker offers: PDF, images, Excel, CSV, Markdown/text. */
export const MENU_FILE_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.gif,.xlsx,.csv,.md,.markdown,.txt,application/pdf,image/*,text/csv,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Items shown in the preview; the rest are summarized as "y N más". */
export const PREVIEW_ITEMS = 8;
