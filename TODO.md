# TODO for Lavandería GMO Dashboard UI Redesign

This file tracks the progress of the UI redesign plan. Steps are executed sequentially, with updates after each completion.

## Steps

- [x] 1. Update src/theme/variables.css: Add Google Fonts import for Inter, set global font-family, and define custom CSS variables for colors, shadows, etc. (e.g., --dashboard-blue: #007BFF; --button-blue: #0056D2; etc.).

- [x] 2. Enhance src/components/Header.tsx: Add white bg with shadow, top-left profile (admin avatar), left logo + title ("Lavandería GMO Dashboard"), center dynamic screen title prop, right icons including notifications (🔔), retain popovers/logout. Add CSS class for styles.

- [x] 3. Update src/App.tsx: Import useLocation from react-router-dom, add getTitleFromPath function for dynamic titles (e.g., /POS → "Lavandería GMO Dashboard"), pass title prop to Header, add 'custom-tabbar' class to IonTabBar for styling.

- [x] 4. Update src/pages/POS.tsx: Remove local IonHeader, redesign Total card (💧 icon, blue number), Pago section (bold label, styled input/button), Últimos Pagos (🧾, table with Fecha/Usuario/Monto, mock users, dividers), Actividad (🗂️, timeline with ✅/🕒/❌, mock statuses/times, blue dots). Extend Transaction interface (add user: string), add imports for icons.

- [x] 5. Update src/pages/Laundry.tsx: Remove local IonHeader, align redesign: Update cards/icons to match POS (💧 total, 🧾 pagos table with mocks, 🗂️ timeline), styled input/button. Extend Transaction interface similarly.

- [x] 6. Update src/pages/POS.css: Add styles for header shadow, cards (rounded/shadow), input/button (blue/rounded), table (grid/dividers), timeline (icons/colors/dots), bottom nav (minimalist icons, gray labels, blue active). Enhance existing.

- [x] 7. If needed, read and update src/pages/Laundry.css to match POS.css styles for consistency (e.g., dashboard-card class).

- [ ] 8. Test the changes: Run `ionic serve`, use browser_action to launch http://localhost:8100/POS and /Laundry, verify layout/no overlaps, close browser. Check for errors.

- [ ] 9. Final verification: Update TODO with completion, use attempt_completion if all done.

Progress: Steps 1-7 completed. Proceeding to testing.
