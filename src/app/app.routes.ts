import { Routes } from '@angular/router';
import {Scanner} from './scanner/scanner';

export const routes: Routes = [
  {
    path: "**",
    component: Scanner,
  },
];
