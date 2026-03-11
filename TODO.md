# Product Wizard Nested Payload Migration TODO

- [x] Analyze current product API/context/types/wizard integration
- [x] Update API request typings for nested product payload contract
- [x] Update ProductContext create flow to submit nested payload
- [x] Update ProductWizard state mapping and submit payload
- [ ] Align product types with nested response/payload structure
- [x] Integrate ProductWizard into ProductsManagementPage create flow
- [ ] Run type/build validation and fix typing issues

# Categories API Contract Fix TODO

- [x] Fix categories request/response contract mismatch with backend
  - [x] Update `src/data/categories.ts` to use `productCategories` request key and parse camelCase response
  - [x] Update `src/utils/apiUtils.ts` to use `productCategories` and parse both camelCase/snake_case response keys
  - [ ] Verify no TypeScript issues in modified sections
