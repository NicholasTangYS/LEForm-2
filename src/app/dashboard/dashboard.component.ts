import { Component, OnInit, effect } from '@angular/core';
import * as echarts from 'echarts';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { baseUrl } from '../../environments/environment';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TopupModalComponent } from '../topup-modal/topup-modal.component';
import { DialogService } from '../dialog.service';

interface Project {
  ID: number;
  name: string;
  status: string;
  year_end: string;
  created_on: string;
  updated_on: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatDialogModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private apiUrl = baseUrl;
  userID: string | null = null;

  creditBalance: number = 0;
  totalProjects: number = 0;
  recentProjects: Project[] = [];
  recentTransactions: Transaction[] = [];
  isLoading: boolean = false;
  usageRate: number = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private dialog: MatDialog,
    private dialogService: DialogService
  ) {
    effect(() => {
      this.userID = this.auth.getUserId();
      if (this.userID) {
        this.loadDashboardData();
      }
    });
  }

  ngOnInit(): void {
    // We let the data loading trigger chart initialization
  }

  loadDashboardData(): void {
    if (!this.userID) return;
    this.isLoading = true;

    forkJoin({
      balance: this.loadCreditBalance(),
      projects: this.getRecentProjects(),
      transactions: this.getRecentTransactions(),
      stats: this.loadDashboardStats()
    }).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (res) => {
        // Data is already handled by tap/subscribe in individual methods or here
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
      }
    });
  }

  loadCreditBalance(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/credits/balance/${this.userID}`).pipe(
      tap((res) => this.creditBalance = parseFloat(res.balance)),
      catchError((err) => {
        console.error('Error balance:', err);
        return of(null);
      })
    );
  }

  getRecentProjects(): Observable<any> {
    return this.http.get<Project[]>(`${this.apiUrl}/getProjectByUser/${this.userID}`).pipe(
      tap((data) => {
        this.totalProjects = data.length;
        this.recentProjects = data.slice(0, 3); // Top 3
      }),
      catchError((err) => {
        console.error('Error projects:', err);
        return of([]);
      })
    );
  }

  getRecentTransactions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/credits/transactions/${this.userID}?limit=5`).pipe(
      tap((res) => this.recentTransactions = res.transactions),
      catchError((err) => {
        console.error('Error transactions:', err);
        return of({ transactions: [] });
      })
    );
  }

  loadDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/credits/stats/${this.userID}`).pipe(
      tap((stats) => {
        this.usageRate = stats.usageRate;
        this.initCashFlowChart(stats.distribution);
        this.initIncomeExpenseChart(stats.trends);
      }),
      catchError((err) => {
        console.error('Error stats:', err);
        this.initCashFlowChart([]);
        this.initIncomeExpenseChart([]);
        return of(null);
      })
    );
  }

  openTopUpModal(): void {
    const dialogRef = this.dialog.open(TopupModalComponent, {
      width: '600px',
      data: { userId: this.userID, currentBalance: this.creditBalance },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadDashboardData();
      }
    });
  }

  createNewReport(): void {
    if (this.creditBalance < 1) {
      this.dialogService.confirm({
        title: 'Insufficient Credits',
        message: 'You need at least 1 credit to create a new report. Would you like to top up now?',
        confirmText: 'Top Up',
        cancelText: 'Maybe Later'
      }).subscribe(confirm => {
        if (confirm) {
          this.openTopUpModal();
        }
      });
      return;
    }
    this.router.navigate(['/home']);
  }

  viewAllReports(): void {
    this.router.navigate(['/reports']);
  }

  editReport(project: Project): void {
    this.auth.setProjectId(project.ID);
    this.router.navigate(['/form']);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }

  initCashFlowChart(data: any[] = []): void {
    const chartDom = document.getElementById('cash-flow-chart');
    if (!chartDom) return;
    const myChart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);

    const displayData = data.length > 0 ? data : [
      { value: 0, name: 'No data' }
    ];

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'item' },
      legend: { bottom: '0%', left: 'center' },
      series: [
        {
          name: 'Credit Usage',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          data: displayData
        }
      ]
    };
    myChart.setOption(option);
  }

  initIncomeExpenseChart(trends: any[] = []): void {
    const chartDom = document.getElementById('income-expense-chart');
    if (!chartDom) return;
    const myChart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);

    const xAxisData = trends.length > 0 ? trends.map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const seriesData = trends.length > 0 ? trends.map(t => t.value) : [0, 0, 0, 0, 0, 0, 0];

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: [{ type: 'category', data: xAxisData }],
      yAxis: [{ type: 'value' }],
      series: [
        { name: 'Usage', type: 'line', smooth: true, data: seriesData, color: '#667eea', areaStyle: { opacity: 0.1 } },
      ]
    };
    myChart.setOption(option);
  }
}
