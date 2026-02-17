import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ApartmentsStore, Apartment, Expense } from './apartments.store';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-apartments-list-page',
  standalone: true,
  templateUrl: './apartments-list.page.html',
  styleUrl: './apartments-list.page.scss',
  imports: [
    UpperCasePipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatInputModule,
    A11yModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApartmentsListPage {
  private readonly store = inject(ApartmentsStore);
  private readonly router = inject(Router);

  protected readonly apartments = this.store.apartments;
  protected readonly totalMonthly = this.store.totalMonthly;

  private draftBills = new Map<
    number,
    {
      label: string;
      amount: number | null;
      isYearly: boolean;
    }
  >();

  protected goToCreate(): void {
    this.router.navigate(['/apartments', 'new']);
  }

  protected getApartmentBillDraft(apartmentId: number) {
    if (!this.draftBills.has(apartmentId)) {
      this.draftBills.set(apartmentId, {
        label: '',
        amount: null,
        isYearly: false,
      });
    }

    return this.draftBills.get(apartmentId)!;
  }

  protected generateColor(name: string): string {
    const colors = ['#3f51b5', '#009688', '#673ab7', '#ff9800', '#e91e63'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  addBill(apartment: Apartment) {
    const draft = this.getApartmentBillDraft(apartment.id);
    if (!draft.label || !draft.amount) return;

    this.store.addExpense(apartment.id, {
      label: draft.label,
      amount: draft.amount,
      type: draft.isYearly ? 'yearly' : 'monthly',
    });

    this.draftBills.delete(apartment.id);
  }

  protected removeApartment(apartment: Apartment): void {
    this.store.removeApartment(apartment.id);
    this.draftBills.delete(apartment.id);
  }

  protected removeBill(apartment: Apartment, bill: Expense): void {
    this.store.removeExpense(apartment.id, bill.id);
  }

  apartmentMonthlyTotal(apartment: Apartment): number {
    return apartment.expenses.reduce(
      (sum, expense) => sum + (expense.type === 'monthly' ? expense.amount : expense.amount / 12),
      0,
    );
  }

  apartmentYearlyTotal(apartment: Apartment): number {
    return apartment.expenses.reduce(
      (sum, expense) => sum + (expense.type === 'monthly' ? expense.amount * 12 : expense.amount),
      0,
    );
  }

  protected editingExpenseId: number | null = null;

  startEdit(apartment: Apartment, expense: Expense) {
    this.editingExpenseId = expense.id;

    this.draftBills.set(apartment.id, {
      label: expense.label,
      amount: expense.amount,
      isYearly: expense.type === 'yearly',
    });
  }

  saveEdit(apartment: Apartment, expense: Expense) {
    const draft = this.getApartmentBillDraft(apartment.id);
    if (!draft.label || !draft.amount) return;

    this.store.removeExpense(apartment.id, expense.id);

    this.store.addExpense(apartment.id, {
      label: draft.label,
      amount: draft.amount,
      type: draft.isYearly ? 'yearly' : 'monthly',
    });

    this.editingExpenseId = null;
    this.draftBills.delete(apartment.id);
  }
  cancelEdit(apartment: Apartment) {
    this.editingExpenseId = null;
    this.draftBills.delete(apartment.id);
  }
  
}
