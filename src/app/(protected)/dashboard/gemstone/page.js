'use client';

// Gemstone Filters — four product metafields taken straight from the
// "Color Stone" rows of each product's ornaverse.components (no calculation
// beyond totals), for Search & Discovery:
//   custom.gemstone_color   every stone colour, full name (list)
//   custom.gemstone_shape   every stone shape, full name (list)
//   custom.gemstone_pieces  total gemstone pieces
//   custom.gemstone_weight  total gemstone carats
//
// The page itself is the shared ../_component-filters/FilterPage; the backend
// is /api/gemstone (lucira-backend lib/gemstone.js has the rules).

import { Gem } from 'lucide-react';
import FilterPage from '../_component-filters/FilterPage';

const list = (v) => v.join(', ');

const config = {
  api: '/api/gemstone',
  icon: Gem,
  title: 'Gemstone Filters',
  subtitle: 'Reads the Color Stone rows of each product’s ornaverse.components and keeps four product metafields in step for Search & Discovery: every stone’s colour and shape (full names), plus the total pieces and total weight.',
  noun: 'gemstone',
  sourceLabel: 'Stones in components',
  fields: [
    { field: 'color', label: 'Colour', fmt: list },
    { field: 'shape', label: 'Shape', fmt: list },
    { field: 'pieces', label: 'Pieces', fmt: (v) => `${v} pcs` },
    { field: 'weight', label: 'Total weight', fmt: (v) => `${v} ct` },
  ],
  noneState: { key: 'no_gemstone', label: 'No gemstone', blurb: 'Components have no Color Stone row (plain gold, diamonds only…).' },
  unmappedBlurb: 'A stone has a colour or shape code with no full name yet. That value is left unwritten (the rest are written) until the code is added in lib/gemstone.js.',
  breakdownLabel: 'Gemstone colours across the catalogue',
  note: (
    <>
      Only the first variant’s components are read — every variant of a product carries the same stones. Values come
      straight from the Color Stone rows: stone_color_code and shape_code as full names, pieces and weight added up.
      A product with several stones keeps them all — colour and shape are lists, so a Blue and Pink ring shows under
      both colours in the filter. Codes of “NA” are skipped. In each value column the bold figure is what the
      metafield should hold and the line under it is what Shopify has now. To show the filters on the storefront, add
      “Gemstone Color” and “Gemstone Shape” (and, if wanted, the pieces and weight) in Shopify → Search &amp;
      Discovery → Filters after the first sync.
    </>
  ),
};

export default function GemstonePage() {
  return <FilterPage config={config} />;
}
