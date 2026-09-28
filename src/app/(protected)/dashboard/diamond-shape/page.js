'use client';

// Diamond Filters — four product metafields from the Diamond rows of each
// product's ornaverse.components, for Search & Discovery:
//   custom.diamond_shape_filter  shape of the biggest diamond ("Round")
//   custom.diamond_carat_filter  ct per stone of that biggest diamond
//   custom.diamond_pieces        total diamond pieces
//   custom.diamond_weight        total diamond carats
//
// The page itself is the shared ../_component-filters/FilterPage; the backend
// is /api/diamond-shape (lucira-backend lib/diamondShape.js has the rules).

import { Diamond } from 'lucide-react';
import FilterPage from '../_component-filters/FilterPage';

const config = {
  api: '/api/diamond-shape',
  icon: Diamond,
  title: 'Diamond Filters',
  subtitle: 'Reads each product’s ornaverse.components and keeps four product metafields in step for Search & Discovery: the biggest diamond’s shape and carat per stone (weight ÷ pieces), plus the total pieces and total weight of all diamonds.',
  noun: 'diamond',
  sourceLabel: 'Biggest diamond',
  fields: [
    { field: 'shape', label: 'Shape', fmt: (v) => v },
    { field: 'carat', label: 'Carat / stone', fmt: (v) => `${v} ct` },
    { field: 'pieces', label: 'Pieces', fmt: (v) => `${v} pcs` },
    { field: 'weight', label: 'Total weight', fmt: (v) => `${v} ct` },
  ],
  noneState: { key: 'no_diamond', label: 'No diamond', blurb: 'Components have no Diamond row (plain gold, colour stones only…).' },
  unmappedBlurb: 'The biggest diamond has a shape code with no full name yet. Carat, pieces and weight are written; the shape waits until the code is added in lib/diamondShape.js.',
  breakdownLabel: 'Biggest-diamond shape across the catalogue',
  note: (
    <>
      Only the first variant’s components are read — every variant of a product carries the same stones, and colour
      stones are ignored (they have the Gemstone Filters page). Shape and carat come from the biggest diamond (largest
      weight ÷ pieces; on a tie the row with the larger total weight wins); pieces and weight are totals over every
      diamond row. In each value column the bold figure is what the metafield should hold and the line under it is
      what Shopify has now. To show the filters on the storefront, add “Diamond Shape Filter”, “Diamond Carat Filter”
      (and, if wanted, the pieces and weight) in Shopify → Search &amp; Discovery → Filters after the first sync.
    </>
  ),
};

export default function DiamondShapePage() {
  return <FilterPage config={config} />;
}
