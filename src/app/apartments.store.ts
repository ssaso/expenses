import { Injectable, computed, effect, signal } from '@angular/core';

export interface Expense {
  id: number;
  label: string;
  amount: number;
  month?: string;
  type: 'monthly' | 'yearly';
}

export interface Apartment {
  id: number;
  name: string;
  notes?: string;
  expenses: Expense[];
}

@Injectable({
  providedIn: 'root',
})
export class ApartmentsStore {
  private nextApartmentId = 1;
  private nextExpenseId = 1;

  private readonly apartmentsSignal = signal<Apartment[]>(this.createMockData());

  readonly apartments = this.apartmentsSignal.asReadonly();

  // 🔥 ОВА Е ТОЧНАТА ПРЕСМЕТКА ЗА ГЛОБАЛНО МЕСЕЧНО
  readonly totalMonthly = computed(() =>
    this.apartmentsSignal().reduce((sum, apartment) => {
      return (
        sum +
        apartment.expenses.reduce((acc, expense) => {
          return acc + (expense.type === 'monthly' ? expense.amount : expense.amount / 12);
        }, 0)
      );
    }, 0),
  );

  private readonly STORAGE_KEY = 'apartments-data';

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.apartmentsSignal.set(JSON.parse(saved));
    }

    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.apartmentsSignal()));
    });
  }

  private createMockData(): Apartment[] {
    const createExpense = (
      label: string,
      amount: number,
      type: 'monthly' | 'yearly' = 'monthly',
    ): Expense => ({
      id: this.nextExpenseId++,
      label,
      amount,
      type,
    });

    return [
      {
        id: this.nextApartmentId++,
        name: 'Скопје стан',
        expenses: [
          createExpense('Данок', 2894, 'yearly'),
          createExpense('Водовод', 209),
          createExpense('ЕВН', 420),
          // createExpense('Комуналец', 500),
          createExpense('Чистење', 650),
        ],
      },
      {
        id: this.nextApartmentId++,
        name: 'Охрид стан',
        expenses: [
          createExpense('Данок', 3500, 'yearly'),
          createExpense('Водовод', 400),
          createExpense('ЕВН', 2500),
          createExpense('Колекторски систем', 193),
          createExpense('Комуналец', 391),
          createExpense('Нискоградба', 180),
          createExpense('Станбен управител', 450),
        ],
      },
      {
        id: this.nextApartmentId++,
        name: 'Св. Стефан стан',
        expenses: [
          createExpense('Данок', 3347, 'yearly'),
          createExpense('Водовод', 150),
          createExpense('ЕВН', 470),
          createExpense('Колекторски систем', 63),
          createExpense('Комуналец', 282),
          createExpense('Нискоградба', 82),
          createExpense('Домко', 732),
        ],
      },
      {
        id: this.nextApartmentId++,
        name: 'Друго',
        expenses: [createExpense('Дрва', 4 * 3500, 'yearly')],
      },
      {
        id: this.nextApartmentId++,
        name: 'Кола',
        expenses: [
          createExpense('Регистрација, Технички итн.', 9000, 'yearly'),
          createExpense('Гуми', 0, 'yearly'),
          createExpense('Годишен сервис', 31000, 'yearly'),
          createExpense('Зелен Картон', 3500, 'yearly'),
          createExpense('Бензин', 1000),
        ],
      },
    ];
  }

  addApartment(name: string, notes?: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const id = this.nextApartmentId++;

    this.apartmentsSignal.update((current) => [
      ...current,
      { id, name: trimmedName, notes, expenses: [] },
    ]);
  }

  removeApartment(apartmentId: number): void {
    this.apartmentsSignal.update((current) => current.filter((a) => a.id !== apartmentId));
  }

  addExpense(apartmentId: number, input: Omit<Expense, 'id'>): void {
    const sanitizedLabel = input.label.trim();
    if (!sanitizedLabel || input.amount <= 0) return;

    const id = this.nextExpenseId++;

    this.apartmentsSignal.update((current) =>
      current.map((apartment) =>
        apartment.id === apartmentId
          ? {
              ...apartment,
              expenses: [...apartment.expenses, { ...input, label: sanitizedLabel, id }],
            }
          : apartment,
      ),
    );
  }

  removeExpense(apartmentId: number, expenseId: number): void {
    this.apartmentsSignal.update((current) =>
      current.map((apartment) =>
        apartment.id === apartmentId
          ? {
              ...apartment,
              expenses: apartment.expenses.filter((e) => e.id !== expenseId),
            }
          : apartment,
      ),
    );
  }
}
