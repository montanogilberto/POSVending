// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ProductLabelReader from './ProductLabelReader';
import type { ProductLabelReading } from '../../../api/productAgentApi';

const extractProductLabel = vi.fn();
const pickProductLabelPhoto = vi.fn();
vi.mock('../../../api/productAgentApi', () => ({
  extractProductLabel: (...a: unknown[]) => extractProductLabel(...a),
}));
vi.mock('../../../utils/pickAvatarPhoto', () => ({
  pickProductLabelPhoto: () => pickProductLabelPhoto(),
}));

afterEach(cleanup);
beforeEach(() => {
  extractProductLabel.mockReset();
  pickProductLabelPhoto.mockReset();
  pickProductLabelPhoto.mockResolvedValue('data:image/jpeg;base64,AAAA');
});

// The Electrolit bottle used to design the agent.
const reading = (over: Partial<ProductLabelReading> = {}): ProductLabelReading => ({
  isProduct: true, confidence: 0.92, brand: 'Electrolit', productName: 'Suero Rehidratante', variant: 'Manzana',
  suggestedName: 'Electrolit Suero Rehidratante Manzana 1000 ml',
  description: 'Solución esterilizada de electrolitos orales.', barCode: '7501125104350',
  netContent: 1000, unitOfMeasure: 'ml', netContentRaw: 'Frasco con 1000 mL',
  expirationDate: '', expirationRaw: '', lotNumber: '', manufacturer: 'Laboratorios PiSA',
  unreadableFields: [], notes: [], issues: [], needsReview: false,
  existingProduct: { status: 'NEW', id: null, name: '', score: 0, candidates: [] }, matchedBy: '',
  ...over,
});

const addPhotoAndRead = async () => {
  fireEvent.click(screen.getByText('Tomar o subir foto'));
  await screen.findByText('Leer etiqueta');
  fireEvent.click(screen.getByText('Leer etiqueta'));
};

describe('ProductLabelReader', () => {
  it('sends every photo with the company and shows what it read', async () => {
    extractProductLabel.mockResolvedValue(reading());
    render(<ProductLabelReader companyId={1} onApply={vi.fn(() => [])} />);
    await addPhotoAndRead();
    expect(await screen.findByText('Electrolit Suero Rehidratante Manzana 1000 ml')).toBeTruthy();
    expect(screen.getByText('7501125104350')).toBeTruthy();
    expect(extractProductLabel).toHaveBeenCalledWith({ companyId: 1, photos: ['data:image/jpeg;base64,AAAA'] });
  });

  it('only fills the form on "Aplicar" and reports which fields it filled', async () => {
    extractProductLabel.mockResolvedValue(reading());
    const onApply = vi.fn(() => ['Nombre', 'Código de barras']);
    render(<ProductLabelReader companyId={1} onApply={onApply} />);
    await addPhotoAndRead();
    await screen.findByText('Aplicar al formulario');
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Aplicar al formulario'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ barCode: '7501125104350' }));
    expect(await screen.findByText(/Se llenó: Nombre, Código de barras/)).toBeTruthy();
  });

  it('warns when the barcode is already registered', async () => {
    extractProductLabel.mockResolvedValue(reading({
      matchedBy: 'barCode',
      existingProduct: { status: 'MATCHED', id: 7, name: 'Suero Electrolit Manzana', score: 1, candidates: [] },
      issues: ['Este código de barras ya está registrado como «Suero Electrolit Manzana» (#7).'],
    }));
    render(<ProductLabelReader companyId={1} onApply={vi.fn(() => [])} />);
    await addPhotoAndRead();
    expect(await screen.findByText(/ya está registrado como «Suero Electrolit Manzana»/)).toBeTruthy();
    // the same message is not repeated in the issues list
    expect(screen.getAllByText(/ya está registrado/)).toHaveLength(1);
  });

  it('says so when the agent could not read the label', async () => {
    extractProductLabel.mockResolvedValue(null);
    render(<ProductLabelReader companyId={1} onApply={vi.fn(() => [])} />);
    await addPhotoAndRead();
    expect(await screen.findByText(/No se pudo leer la etiqueta/)).toBeTruthy();
    expect(screen.queryByText('Aplicar al formulario')).toBeNull();
  });

  it('shows the issues for the reviewer and nothing to apply for a non-product photo', async () => {
    extractProductLabel.mockResolvedValue(reading({ isProduct: false }));
    render(<ProductLabelReader companyId={1} onApply={vi.fn(() => [])} />);
    await addPhotoAndRead();
    expect(await screen.findByText('La foto no parece ser de un producto.')).toBeTruthy();
    expect(screen.queryByText('Aplicar al formulario')).toBeNull();
  });

  it('allows up to three photos', async () => {
    render(<ProductLabelReader companyId={1} onApply={vi.fn(() => [])} />);
    fireEvent.click(screen.getByText('Tomar o subir foto'));
    for (let i = 0; i < 2; i++) {
      fireEvent.click(await screen.findByText('Agregar otra foto'));
    }
    await waitFor(() => expect(screen.getAllByAltText(/Foto \d del producto/)).toHaveLength(3));
    expect(screen.queryByText('Agregar otra foto')).toBeNull();
  });
});
