import {
  Component,
  inject,
  computed,
  effect,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import Chart from 'chart.js/auto';
import { ApartmentsStore, Apartment, Expense } from './apartments.store';

@Component({
  selector: 'app-summary-dashboard2',
  standalone: true,
  templateUrl: './summary-dashboard2.html',
  styleUrl: './summary-dashboard2.scss',
  imports: [DecimalPipe, MatCardModule],
})
export class SummaryDashboard2Component implements AfterViewInit, OnDestroy {
  private readonly store = inject(ApartmentsStore);
  private readonly mkdToEurRate = 61.5;

  apartments = this.store.apartments;
  totalMonthly = this.store.totalMonthly;
  totalYearly = computed(() => this.totalMonthly() * 12);
  totalApartments = computed(() => this.apartments().length);
  totalExpenses = computed(() =>
    this.apartments().reduce((sum, apartment) => sum + apartment.expenses.length, 0),
  );
  monthlyExpenseCount = computed(() =>
    this.apartments().reduce(
      (sum, apartment) =>
        sum + apartment.expenses.filter((expense) => expense.type === 'monthly').length,
      0,
    ),
  );
  yearlyExpenseCount = computed(() => this.totalExpenses() - this.monthlyExpenseCount());
  avgMonthlyPerApartment = computed(() =>
    this.totalApartments() ? this.totalMonthly() / this.totalApartments() : 0,
  );
  avgMonthlyPerExpense = computed(() =>
    this.totalExpenses() ? this.totalMonthly() / this.totalExpenses() : 0,
  );
  totalMonthlyEUR = computed(() => this.totalMonthly() / this.mkdToEurRate);
  totalYearlyEUR = computed(() => this.totalYearly() / this.mkdToEurRate);

  apartmentMonthlyBreakdown = computed(() =>
    this.apartments().map((apartment) => {
      const monthly = apartment.expenses
        .filter((expense) => expense.type === 'monthly')
        .reduce((sum, expense) => sum + expense.amount, 0);
      const yearlyMonthlyEquivalent = apartment.expenses
        .filter((expense) => expense.type === 'yearly')
        .reduce((sum, expense) => sum + expense.amount / 12, 0);

      return {
        name: apartment.name,
        monthly,
        yearlyMonthlyEquivalent,
        total: monthly + yearlyMonthlyEquivalent,
        expenseCount: apartment.expenses.length,
      };
    }),
  );

  monthlyVsYearlyAmount = computed(() =>
    this.apartments().reduce(
      (totals, apartment) => {
        apartment.expenses.forEach((expense) => {
          if (expense.type === 'monthly') {
            totals.monthly += expense.amount;
          } else {
            totals.yearlyMonthlyEquivalent += expense.amount / 12;
          }
        });
        return totals;
      },
      { monthly: 0, yearlyMonthlyEquivalent: 0 },
    ),
  );

  monthlyAmountShare = computed(() => {
    const totals = this.monthlyVsYearlyAmount();
    const total = totals.monthly + totals.yearlyMonthlyEquivalent;
    return total ? (totals.monthly / total) * 100 : 0;
  });

  yearlyAmountShare = computed(() => 100 - this.monthlyAmountShare());

  largestExpense = computed(() => {
    const all = this.getAllExpensesWithApartment();
    if (!all.length) return null;
    return all.reduce((largest, current) =>
      current.monthlyEquivalent > largest.monthlyEquivalent ? current : largest,
    );
  });

  mostExpensiveApartment = computed(() => {
    const breakdown = this.apartmentMonthlyBreakdown();
    if (!breakdown.length) return null;
    return breakdown.reduce((max, current) => (current.total > max.total ? current : max));
  });

  leastExpensiveApartment = computed(() => {
    const breakdown = this.apartmentMonthlyBreakdown();
    if (!breakdown.length) return null;
    return breakdown.reduce((min, current) => (current.total < min.total ? current : min));
  });

  topExpensesByMonthlyEquivalent = computed(() => {
    const byLabel = new Map<string, number>();
    this.getAllExpensesWithApartment().forEach((expense) => {
      byLabel.set(expense.label, (byLabel.get(expense.label) ?? 0) + expense.monthlyEquivalent);
    });

    return Array.from(byLabel.entries())
      .map(([label, monthlyEquivalent]) => ({ label, monthlyEquivalent }))
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
      .slice(0, 8);
  });

  apartmentsByExpenseCount = computed(() =>
    this.apartmentMonthlyBreakdown()
      .map((apartment) => ({ name: apartment.name, count: apartment.expenseCount }))
      .sort((a, b) => b.count - a.count),
  );

  @ViewChild('breakdownChart') breakdownChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratioChart') ratioChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('compositionChart') compositionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topExpensesChart') topExpensesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('countChart') countChartRef!: ElementRef<HTMLCanvasElement>;

  private breakdownChart!: Chart;
  private ratioChart!: Chart;
  private compositionChart!: Chart;
  private topExpensesChart!: Chart;
  private countChart!: Chart;

  constructor() {
    effect(() => {
      this.updateChartsSafe();
    });
  }

  ngAfterViewInit() {
    this.initCharts();
    this.updateChartsSafe();

    requestAnimationFrame(() => {
      this.forceChartReflow();
      setTimeout(() => this.forceChartReflow(), 120);
    });
  }

  ngOnDestroy() {
    this.getCharts()
      .filter(Boolean)
      .forEach((chart) => chart.destroy());
  }

  private getCharts(): Chart[] {
    return [
      this.breakdownChart,
      this.ratioChart,
      this.compositionChart,
      this.topExpensesChart,
      this.countChart,
    ];
  }

  private forceChartReflow() {
    this.getCharts()
      .filter(Boolean)
      .forEach((chart) => {
        chart.resize();
        chart.update('none');
      });
  }

  private initCharts() {
    const ctxBar = this.breakdownChartRef.nativeElement.getContext('2d')!;
    const gradientBar = ctxBar.createLinearGradient(0, 0, 0, 400);
    gradientBar.addColorStop(0, 'rgba(99,102,241,0.9)');
    gradientBar.addColorStop(1, 'rgba(59,130,246,0.3)');

    this.breakdownChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'MKD / month',
            data: [],
            backgroundColor: gradientBar,
            borderRadius: 14,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            grid: {
              color: 'rgba(255,255,255,0.08)',
            },
          },
        },
      },
    });

    const ctxDonut = this.ratioChartRef.nativeElement.getContext('2d')!;
    const gradientMonthly = ctxDonut.createLinearGradient(0, 0, 0, 300);
    gradientMonthly.addColorStop(0, '#6366f1');
    gradientMonthly.addColorStop(1, '#3b82f6');

    const gradientYearly = ctxDonut.createLinearGradient(0, 0, 0, 300);
    gradientYearly.addColorStop(0, '#f59e0b');
    gradientYearly.addColorStop(1, '#ef4444');

    this.ratioChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Monthly expenses', 'Yearly expenses (monthly equivalent)'],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: [gradientMonthly, gradientYearly],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        animation: {
          animateRotate: true,
          duration: 900,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#fff',
            },
          },
        },
      },
    });

    const ctxComposition = this.compositionChartRef.nativeElement.getContext('2d')!;
    this.compositionChart = new Chart(ctxComposition, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Monthly',
            data: [],
            backgroundColor: '#38bdf8',
            borderRadius: 8,
            stack: 'stack-0',
          },
          {
            label: 'Yearly / 12',
            data: [],
            backgroundColor: '#f97316',
            borderRadius: 8,
            stack: 'stack-0',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#fff' } },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
        },
      },
    });

    const ctxTop = this.topExpensesChartRef.nativeElement.getContext('2d')!;
    this.topExpensesChart = new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'MKD / month',
            data: [],
            backgroundColor: '#a78bfa',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
          y: {
            grid: { display: false },
          },
        },
      },
    });

    const ctxCount = this.countChartRef.nativeElement.getContext('2d')!;
    this.countChart = new Chart(ctxCount, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Expenses count',
            data: [],
            borderColor: '#34d399',
            backgroundColor: 'rgba(52,211,153,0.25)',
            tension: 0.3,
            fill: true,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#fff' } },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
        },
      },
    });
  }

  private updateChartsSafe() {
    if (
      !this.breakdownChart ||
      !this.ratioChart ||
      !this.compositionChart ||
      !this.topExpensesChart ||
      !this.countChart
    ) {
      return;
    }

    this.updateCharts();
  }

  private updateCharts() {
    const breakdown = this.apartmentMonthlyBreakdown();
    const amountRatio = this.monthlyVsYearlyAmount();
    const topExpenses = this.topExpensesByMonthlyEquivalent();
    const counts = this.apartmentsByExpenseCount();

    this.breakdownChart.data.labels = breakdown.map((apartment) => apartment.name);
    this.breakdownChart.data.datasets[0].data = breakdown.map((apartment) => apartment.total);
    this.breakdownChart.update('none');

    this.ratioChart.data.datasets[0].data = [
      amountRatio.monthly,
      amountRatio.yearlyMonthlyEquivalent,
    ];
    this.ratioChart.update('none');

    this.compositionChart.data.labels = breakdown.map((apartment) => apartment.name);
    this.compositionChart.data.datasets[0].data = breakdown.map((apartment) => apartment.monthly);
    this.compositionChart.data.datasets[1].data = breakdown.map(
      (apartment) => apartment.yearlyMonthlyEquivalent,
    );
    this.compositionChart.update('none');

    this.topExpensesChart.data.labels = topExpenses.map((expense) => expense.label);
    this.topExpensesChart.data.datasets[0].data = topExpenses.map(
      (expense) => expense.monthlyEquivalent,
    );
    this.topExpensesChart.update('none');

    this.countChart.data.labels = counts.map((item) => item.name);
    this.countChart.data.datasets[0].data = counts.map((item) => item.count);
    this.countChart.update('none');
  }

  private getAllExpensesWithApartment(): Array<{
    apartmentName: string;
    label: string;
    monthlyEquivalent: number;
  }> {
    return this.apartments().flatMap((apartment: Apartment) =>
      apartment.expenses.map((expense: Expense) => ({
        apartmentName: apartment.name,
        label: expense.label,
        monthlyEquivalent: expense.type === 'monthly' ? expense.amount : expense.amount / 12,
      })),
    );
  }

  protected eur(amount: number): number {
    return amount / this.mkdToEurRate;
  }
}
