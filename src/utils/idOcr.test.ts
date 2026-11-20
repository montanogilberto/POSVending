import { describe, expect, it } from 'vitest';
import { mergeOcrPass, frontNeedsAnotherPass, IdFieldsState, EMPTY_EXTRACTED_ID_FIELDS } from './idOcr';

const state = (fields: Partial<typeof EMPTY_EXTRACTED_ID_FIELDS>, low: string[] = [], source: IdFieldsState['source'] = {}): IdFieldsState => ({
  fields: { ...EMPTY_EXTRACTED_ID_FIELDS, ...fields },
  low: new Set(low as never[]),
  source,
});
const pass = (fields: Partial<typeof EMPTY_EXTRACTED_ID_FIELDS>, low: string[] = []) => ({
  fields: { ...EMPTY_EXTRACTED_ID_FIELDS, ...fields },
  lowConfidenceFields: low,
});

describe('mergeOcrPass', () => {
  it('an empty value never wipes a read one', () => {
    const r = mergeOcrPass(state({ curp: 'AAAA' }, [], { curp: 'ocr' }), pass({ curp: '' }), 'ocr-hires');
    expect(r.fields.curp).toBe('AAAA');
  });
  it('a low-confidence value never replaces a confident one', () => {
    const r = mergeOcrPass(state({ curp: 'AAAA' }, [], { curp: 'ocr' }), pass({ curp: 'BBBB' }, ['curp']), 'ocr-hires');
    expect(r.fields.curp).toBe('AAAA');
    expect(r.low.has('curp')).toBe(false);
  });
  it('a confident value replaces a low-confidence one and clears the flag', () => {
    const r = mergeOcrPass(state({ curp: 'AAAA' }, ['curp'], { curp: 'ocr' }), pass({ curp: 'BBBB' }), 'ocr-hires');
    expect(r.fields.curp).toBe('BBBB');
    expect(r.low.has('curp')).toBe(false);
    expect(r.source.curp).toBe('ocr-hires');
  });
  it('a typed value is never replaced', () => {
    const r = mergeOcrPass(state({ nombre: 'Ana' }, [], { nombre: 'manual' }), pass({ nombre: 'ANA X' }), 'ocr-hires');
    expect(r.fields.nombre).toBe('Ana');
  });
  it('fills empty fields and keeps their flag', () => {
    const r = mergeOcrPass(state({}), pass({ cic: '123456789' }, ['cic']), 'ocr');
    expect(r.fields.cic).toBe('123456789');
    expect(r.low.has('cic')).toBe(true);
  });
});

describe('frontNeedsAnotherPass', () => {
  const full = { nombre: 'A', curp: 'B', claveElector: 'C', fechaNacimiento: 'D', vigencia: '2033' };
  it('no when every front field is read with confidence', () => {
    expect(frontNeedsAnotherPass(state(full))).toBe(false);
  });
  it('yes when one is empty or unsure', () => {
    expect(frontNeedsAnotherPass(state({ ...full, curp: '' }))).toBe(true);
    expect(frontNeedsAnotherPass(state(full, ['curp']))).toBe(true);
  });
});
