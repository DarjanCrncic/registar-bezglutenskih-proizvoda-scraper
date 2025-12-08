import {Injectable} from '@angular/core';

export interface Product {
  title?: string;
  url?: string;
  short_description?: string;
  details?: { [key: string]: any };
  image?: string;

  // allow arbitrary keys
  [k: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private eanIndex: Record<string, Product> = {};

  // URL to your hosted JSONL file (adjust if needed)
  private readonly DATA_URL = 'https://darjancrncic.github.io/registar-bezglutenskih-proizvoda-scraper/gluten_free_products.jsonl';

  constructor() {
  }

  // Load and parse JSONL (or a JSON array) and build index
  async loadIndex(): Promise<void> {

    const res = await fetch(this.DATA_URL);
    if (!res.ok) throw new Error(`Failed to fetch data: ${res.status}`);
    const text = await res.text();

    // try to detect JSON array vs JSONL
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    // JSONL - one JSON object per line
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line) as Product;
        const ean = this.findEAN(item);
        if (ean) this.eanIndex[ean] = item;
      } catch (err) {
        // ignore malformed lines
        console.warn('Skipping bad line in JSONL', err);
      }
    }
  }

  // Attempt to find EAN in known locations (details.EAN, EAN, ean)
  private findEAN(item: Product): string | null {
    if (!item) return null;
    const possible = [
      item.details?.['EAN'],
      item.details?.['ean'],
      item['EAN'],
      item['ean'],
      item.details?.['Ean']
    ];
    for (const v of possible) {
      if (v) return String(v).trim();
    }
    return null;
  }

  searchByEAN(eanRaw: string): Product | null {
    if (!eanRaw) return null;
    const ean = String(eanRaw).trim();
    return this.eanIndex[ean] || null;
  }
}
