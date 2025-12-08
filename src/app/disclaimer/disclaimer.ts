import {Component, OnInit, signal} from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-disclaimer',
  templateUrl: './disclaimer.html'
})
export class DisclaimerComponent implements OnInit {
  visible = signal(true);
  private readonly STORAGE_KEY = 'gf_disclaimer_hidden';

  ngOnInit(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    this.visible.set(stored !== 'true'); // show only if not dismissed
  }

  dismiss() {
    this.visible.set(false);
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }
}
