import {
  Component,
  inject,
  computed,
  effect,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import Chart from 'chart.js/auto';
import { ApartmentsStore, Apartment } from './apartments.store';

@Component({
  selector: 'app-summary-dashboard',
  standalone: true,
  templateUrl: './summary-dashboard.html',
  styleUrl: './summary-dashboard.scss',
  imports: [DecimalPipe, DatePipe, MatCardModule, MatIconModule],
})
export class SummaryDashboardComponent implements AfterViewInit {
  private store = inject(ApartmentsStore);

  apartments = this.store.apartments;
  totalMonthly = this.store.totalMonthly;
  totalYearly = computed(() => this.totalMonthly() * 12);

  // New computed signals for insights
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

  constructor() {
    effect(() => {
      this.updateChartsSafe();
    });
  }

  ngAfterViewInit() {
    this.initCharts();
    this.updateChartsSafe();
  }

  private initCharts() {
    // Bar chart
    this.breakdownChart = new Chart(this.breakdownChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'MKD / month',
            data: [],
            backgroundColor: 'rgba(63, 81, 181, 0.7)',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (value) => value + ' MKD' },
          },
        },
      },
    });

    // Doughnut chart
    this.ratioChart = new Chart(this.ratioChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Monthly', 'Yearly'],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ['#3f51b5', '#ff9800'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  private updateChartsSafe() {
    if (!this.breakdownChart || !this.ratioChart) return;
    this.updateCharts();
  }

  private updateCharts() {
    const apartments = this.apartments();

    const monthlyPerApartment = apartments.map((a) =>
      a.expenses.reduce((sum, e) => sum + (e.type === 'monthly' ? e.amount : e.amount / 12), 0),
    );

    this.breakdownChart.data.labels = apartments.map((a) => a.name);
    this.breakdownChart.data.datasets[0].data = monthlyPerApartment;
    this.breakdownChart.update();

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
    this.ratioChart.update();
  }

  // Helper used in computed signals
  private apartmentMonthlyTotal(apartment: Apartment): number {
    return apartment.expenses.reduce(
      (sum, e) => sum + (e.type === 'monthly' ? e.amount : e.amount / 12),
      0,
    );
  }
}
