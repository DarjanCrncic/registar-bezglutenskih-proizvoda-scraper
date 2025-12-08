import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {DisclaimerComponent} from './disclaimer/disclaimer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DisclaimerComponent],
  templateUrl: './app.html',
})
export class App {
}
