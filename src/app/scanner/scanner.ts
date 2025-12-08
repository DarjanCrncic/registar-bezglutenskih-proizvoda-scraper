import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {Product, ProductService} from '../product.service';
import {Html5Qrcode} from 'html5-qrcode';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-scanner',
  imports: [
    FormsModule
  ],
  templateUrl: './scanner.html',
})
export class Scanner implements OnInit, OnDestroy {
  loading = signal(true);
  error = signal<string | null>(null);

  // UI state
  isScannerOpen = signal(false);
  lastScanned: string | null = null;
  foundProduct: Product | null = null;
  // foundProduct: Product | null = {
  //   "title": "Ajvar blagi 195 g",
  //   "url": "https://bezglutena.celivita.hr/Products/Details?id=404",
  //   "short_description": "paprika (76%), plavi patlidžan (12%), suncokretovo ulje, alkoholni ocat, koncentrat rajčica (2,6%), kuhinjska sol, šećer, začini, ljuti feferon; Masti = 4 g,- zasićene masne kiseline = 0.3 g,Ugljikohidrati = 8 g,- šećeri = 8 g,Bjelančevine = 1.5 g,Sol = 1.5 g",
  //   "details": {
  //     "EAN": "3850104022517",
  //     "Proizvođač": "Podravka",
  //     "Distributer": "Podravka",
  //     "Pakiranje": "Staklenka",
  //     "Neto količina": "195.00 g",
  //     "notes": [
  //       "Izjava proizvođača",
  //       "Poveznica na web stranicu proizvođača"
  //     ],
  //     "external_link": "https://www.podravka.hr/proizvod/ajvar-blagi/"
  //   },
  //   "image": "https://bezglutena.celivita.hr/image/product/404/20240211123437_details.png"
  // };

  private html5QrCode: Html5Qrcode | null = null;
  private readonly qrRegionId = 'qr-reader';

  constructor(private productService: ProductService) {
  }

  async ngOnInit() {
    try {
      await this.productService.loadIndex();
    } catch (err: any) {
      console.error(err);
      this.error.set('Nije moguće učitati proizvode.');
    } finally {
      this.loading.set(false);
    }
  }

  openScanner() {
    this.isScannerOpen.set(true);
    // start scanner on next tick
    setTimeout(() => this.startScanner(), 0);
  }

  async startScanner() {
    if (this.html5QrCode) return; // already started
    try {
      this.html5QrCode = new Html5Qrcode(this.qrRegionId, {verbose: false});

      // fallback to generic if exact camera mode fails
      await this.html5QrCode.start(
        {facingMode: 'environment'},
        {
          fps: 10,              // frames per second
          qrbox: {width: 400, height: 300}, // scanning box
          aspectRatio: 1.33
        },
        (decodedText, decodedResult) => {
          // success callback
          this.onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // parse error callback - ignored
        }
      );
    } catch (err) {
      // try generic start without constraints
      console.warn('start failed w constraints, trying generic', err);
      try {
        if (!this.html5QrCode) this.html5QrCode = new Html5Qrcode(this.qrRegionId);
        await this.html5QrCode.start(
          {facingMode: 'environment'},
          {fps: 10, qrbox: {width: 300, height: 200}},
          (decodedText) => this.onScanSuccess(decodedText),
          () => {
          }
        );
      } catch (e) {
        console.error('Failed to start scanner', e);
        this.error.set('Nije moguće pristupiti kameri kako bi pokrenuo skener.');
        this.closeScanner();
      }
    }
  }

  private onScanSuccess(decodedText: string) {
    // Stop scanning right away to reduce CPU and avoid duplicate scans
    this.lastScanned = decodedText;
    this.closeScanner()
    // try to find product by EAN (some scanners add whitespace or text)
    const eanCandidate = decodedText.replace(/\s/g, '');
    this.foundProduct = this.productService.searchByEAN(eanCandidate);

    // If not found, also try raw decoded text (some barcodes contain prefix)
    if (!this.foundProduct) {
      this.foundProduct = this.productService.searchByEAN(decodedText);
    }
  }

  async stopScanner() {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
      } catch (e) {
        console.warn('Error stopping scanner', e);
      }
      try {
        this.html5QrCode.clear();
      } catch (e) {
        // ignore
      }
      this.html5QrCode = null;
    }
  }

  // Close modal and cleanup
  closeScanner() {
    this.isScannerOpen.set(false);
    this.stopScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  protected readonly Object = Object;
}
