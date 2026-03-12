# Chunk Reduction Plan

- [x] Analyze bundle warnings and identify root causes
- [x] Update `src/api/categoriesApi.ts` to remove ineffective dynamic import
- [x] Refactor `src/App.tsx` to use route-level lazy loading with `React.lazy` + `Suspense`
- [x] Update `vite.config.ts` with `manualChunks` for better vendor splitting
- [ ] Run production build and compare chunk output/warnings
- [ ] Summarize results and remaining optimization opportunities
