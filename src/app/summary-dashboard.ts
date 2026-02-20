import {
  Component,
  inject,
  computed,
  effect,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { DecimalPipe, DatePipe, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import Chart from 'chart.js/auto';
import { ApartmentsStore, Apartment } from './apartments.store';

@Component({
  selector: 'app-summary-dashboard',
  standalone: true,
  templateUrl: './summary-dashboard.html',
  styleUrl: './summary-dashboard.scss',
  imports: [DecimalPipe, DatePipe, CommonModule, MatCardModule, MatIconModule],
})
export class SummaryDashboardComponent implements AfterViewInit, OnDestroy {
  private store = inject(ApartmentsStore);
  private ngZone = inject(NgZone);

  apartments = this.store.apartments;
  totalMonthly = this.store.totalMonthly;
  totalYearly = computed(() => this.totalMonthly() * 12);

  // Insights signals
  totalApartments = computed(() => this.apartments().length);
  totalExpensesCount = computed(() =>
    this.apartments().reduce((acc, a) => acc + a.expenses.length, 0),
  );
  apartmentsWithExpenses = computed(
    () => this.apartments().filter((a) => a.expenses.length > 0).length,
  );
  emptyApartments = computed(() => this.totalApartments() - this.apartmentsWithExpenses());

  monthlyExpensesCount = computed(() =>
    this.apartments().reduce(
      (acc, a) => acc + a.expenses.filter((e) => e.type === 'monthly').length,
      0,
    ),
  );
  yearlyExpensesCount = computed(() => this.totalExpensesCount() - this.monthlyExpensesCount());

  avgMonthlyPerApartment = computed(() =>
    this.totalApartments() ? this.totalMonthly() / this.totalApartments() : 0,
  );
  avgYearlyPerApartment = computed(() =>
    this.totalApartments() ? this.totalYearly() / this.totalApartments() : 0,
  );

  mostExpensiveApartmentMonthly = computed(() => {
    if (this.totalApartments() === 0) return 0;
    return Math.max(...this.apartments().map((a) => this.apartmentMonthlyTotal(a)));
  });
  mostExpensiveApartmentName = computed(() => {
    if (this.totalApartments() === 0) return '';
    const maxApartment = this.apartments().reduce(
      (max, a) => {
        const total = this.apartmentMonthlyTotal(a);
        return total > max.total ? { name: a.name, total } : max;
      },
      { name: '', total: -Infinity },
    );
    return maxApartment.name;
  });

  leastExpensiveApartmentMonthly = computed(() => {
    if (this.totalApartments() === 0) return 0;
    return Math.min(...this.apartments().map((a) => this.apartmentMonthlyTotal(a)));
  });
  leastExpensiveApartmentName = computed(() => {
    if (this.totalApartments() === 0) return '';
    const minApartment = this.apartments().reduce(
      (min, a) => {
        const total = this.apartmentMonthlyTotal(a);
        return total < min.total ? { name: a.name, total } : min;
      },
      { name: '', total: Infinity },
    );
    return minApartment.name;
  });

  lastUpdated = computed(() => new Date());
  today = new Date();

  @ViewChild('breakdownChart') breakdownChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratioChart') ratioChartRef!: ElementRef<HTMLCanvasElement>;

  private breakdownChart!: Chart;
  private ratioChart!: Chart;
  private updateTimeout: any; // for debouncing

  constructor() {
    // Update charts when apartments data changes
    effect(() => {
      const apartments = this.apartments(); // track dependency
      if (this.breakdownChart && this.ratioChart) {
        this.updateCharts();
      }
    });
  }

  ngAfterViewInit() {
    this.initCharts();
    // Initial population after charts are ready
    setTimeout(() => this.updateCharts(), 100);
  }

  ngOnDestroy() {
    clearTimeout(this.updateTimeout);
  }

  private initCharts() {
    this.initBreakdownChart();
    this.initRatioChart();
  }

  private initBreakdownChart() {
    this.breakdownChart = new Chart(this.breakdownChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'MKD / month',
            data: [],
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 2,
            borderRadius: 12,
            hoverBackgroundColor: 'rgba(118, 75, 162, 0.9)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 14, weight: 600 },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context) => `${(context.parsed?.y ?? 0).toLocaleString()} MKD/month`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12, weight: 500 } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: (value) => value.toLocaleString() + ' MKD',
              font: { size: 11 },
            },
          },
        },
      },
    });
  }

  private initRatioChart() {
    this.ratioChart = new Chart(this.ratioChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Monthly', 'Yearly'],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)'],
            borderColor: ['rgba(102, 126, 234, 1)', 'rgba(118, 75, 162, 1)'],
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1200,
          easing: 'easeInOutQuart',
        },
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 13, weight: 500 },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 14, weight: 600 },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed.toLocaleString()} MKD (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }


  private updateCharts() {
    const apartments = this.apartments();

    // Update breakdown chart
    const monthlyPerApartment = apartments.map((a) =>
      a.expenses.reduce((sum, e) => sum + (e.type === 'monthly' ? e.amount : e.amount / 12), 0),
    );
    this.breakdownChart.data.labels = apartments.map((a) => a.name);
    this.breakdownChart.data.datasets[0].data = monthlyPerApartment;
    this.breakdownChart.update('none');

    // Update ratio chart
    const monthlyTotal = apartments.reduce(
      (sum, a) =>
        sum + a.expenses.filter((e) => e.type === 'monthly').reduce((s, e) => s + e.amount, 0),
      0,
    );
    const yearlyMonthlyEquivalent = apartments.reduce(
      (sum, a) =>
        sum + a.expenses.filter((e) => e.type === 'yearly').reduce((s, e) => s + e.amount / 12, 0),
      0,
    );
    this.ratioChart.data.datasets[0].data = [monthlyTotal, yearlyMonthlyEquivalent];
    this.ratioChart.update('none');
  }

  private apartmentMonthlyTotal(apartment: Apartment): number {
    return apartment.expenses.reduce(
      (sum, e) => sum + (e.type === 'monthly' ? e.amount : e.amount / 12),
      0,
    );
  }

  topExpenses = computed(() => {
    const allExpenses = this.apartments().flatMap((a) =>
      a.expenses.map((e) => ({
        name: e.label || `${a.name} - ${e.type}`,
        amount: e.amount,
        type: e.type,
        apartment: a.name,
      })),
    );
    return allExpenses.sort((a, b) => b.amount - a.amount).slice(0, 10);
  });

  expenseCategories = computed(() => {
    const categories = new Map<string, number>();
    this.apartments().forEach((a) => {
      a.expenses.forEach((e) => {
        const category = e.label || 'Uncategorized';
        categories.set(category, (categories.get(category) || 0) + e.amount);
      });
    });
    return Array.from(categories.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  });
}
