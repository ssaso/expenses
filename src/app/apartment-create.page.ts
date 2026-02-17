import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { ApartmentsStore } from './apartments.store';

@Component({
  selector: 'app-apartment-create-page',
  templateUrl: './apartment-create.page.html',
  styleUrl: './apartment-create.page.scss',
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApartmentCreatePage {
  private readonly store = inject(ApartmentsStore);
  private readonly router = inject(Router);

  protected createApartment(nameInput: HTMLInputElement, notesInput: HTMLTextAreaElement): void {
    const name = nameInput.value;
    const notes = notesInput.value;

    this.store.addApartment(name, notes);

    if (!name.trim()) {
      return;
    }

    this.router.navigate(['/apartments']);
  }

  protected cancel(): void {
    this.router.navigate(['/apartments']);
  }
}

