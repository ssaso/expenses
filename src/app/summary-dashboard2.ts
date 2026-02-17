import {
  Component,
  inject,
  computed,
  effect,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import Chart from 'chart.js/auto';
import { ApartmentsStore } from './apartments.store';

@Component({
  selector: 'app-summary-dashboard2',
  standalone: true,
  templateUrl: './summary-dashboard2.html',
  styleUrl: './summary-dashboard2.scss',
  imports: [DecimalPipe, MatCardModule],
})
export class SummaryDashboard2Component implements AfterViewInit {
  private store = inject(ApartmentsStore);

  apartments = this.store.apartments;
  totalMonthly = this.store.totalMonthly;
  totalYearly = computed(() => this.totalMonthly() * 12);

  @ViewChild('breakdownChart') breakdownChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratioChart') ratioChartRef!: ElementRef<HTMLCanvasElement>;

  private breakdownChart!: Chart;
  private ratioChart!: Chart;

  constructor() {
    // ✅ effect мора тука
    effect(() => {
      this.updateChartsSafe();
    });
  }

  ngAfterViewInit() {
    this.initCharts();
    this.updateChartsSafe();
  }

  private initCharts2() {
    this.breakdownChart = new Chart(this.breakdownChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'MKD / month',
            data: [],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });

    this.ratioChart = new Chart(this.ratioChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Monthly', 'Yearly'],
        datasets: [{ data: [0, 0] }],
      },
      options: {
        responsive: true,
        cutout: '65%',
      },
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
        labels: ['Monthly', 'Yearly'],
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
  }

  // 🔥 Safe wrapper
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

    const yearlyTotal = apartments.reduce(
      (sum, a) =>
        sum + a.expenses.filter((e) => e.type === 'yearly').reduce((s, e) => s + e.amount / 12, 0),
      0,
    );

    this.ratioChart.data.datasets[0].data = [monthlyTotal, yearlyTotal];

    this.ratioChart.update();
  }

  public x() {
    const xx = this.apartments().reduce((sum, a) => sum + a.expenses.length, 0);

    return xx;
  }
}
