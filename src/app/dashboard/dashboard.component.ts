import { Component, OnInit, effect } from '@angular/core';
import * as echarts from 'echarts';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { baseUrl } from '../../environments/environment';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TopupModalComponent } from '../topup-modal/topup-modal.component';

interface Project {
  ID: number;
  name: string;
  status: string;
  year_end: string;
  created_on: string;
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private dialog: MatDialog
  ) {
    effect(() => {
      this.userID = this.auth.getUserId();
      if (this.userID) {
        this.loadDashboardData();
      }
    });
  }

  ngOnInit(): void {
    // Chart initialization will happen after data is loaded if needed
    // or we can use fixed data for now with improved UI
    setTimeout(() => {
      this.initCashFlowChart();
      this.initIncomeExpenseChart();
    }, 500);
  }

  loadDashboardData(): void {
    if (!this.userID) return;
    this.isLoading = true;

    this.loadCreditBalance();
    this.getRecentProjects();
    this.getRecentTransactions();
  }

  loadCreditBalance(): void {
    this.http.get<any>(`${this.apiUrl}/api/credits/balance/${this.userID}`).subscribe({
      next: (res) => this.creditBalance = parseFloat(res.balance),
      error: (err) => console.error('Error balance:', err)
    });
  }

  getRecentProjects(): void {
    this.http.get<Project[]>(`${this.apiUrl}/getProjectByUser/${this.userID}`).subscribe({
      next: (data) => {
        this.totalProjects = data.length;
        this.recentProjects = data.slice(0, 3); // Top 3
      },
      error: (err) => console.error('Error projects:', err)
    });
  }

  getRecentTransactions(): void {
    this.http.get<any>(`${this.apiUrl}/api/credits/transactions/${this.userID}?limit=5`).subscribe({
      next: (res) => this.recentTransactions = res.transactions,
      error: (err) => console.error('Error transactions:', err)
    });
  }

  openTopUpModal(): void {
    const dialogRef = this.dialog.open(TopupModalComponent, {
      width: '600px',
      data: { userId: this.userID, currentBalance: this.creditBalance },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadCreditBalance();
        this.getRecentTransactions();
      }
    });
  }

  createNewReport(): void {
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

  initCashFlowChart(): void {
    const chartDom = document.getElementById('cash-flow-chart');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom);

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
          emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
          data: [
            { value: 1048, name: 'Form Generation' },
            { value: 735, name: 'Top-ups' },
            { value: 580, name: 'Bonus' },
          ]
        }
      ]
    };
    myChart.setOption(option);
  }

  initIncomeExpenseChart(): void {
    const chartDom = document.getElementById('income-expense-chart');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom);

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: [{ type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
      yAxis: [{ type: 'value' }],
      series: [
        { name: 'Usage', type: 'line', smooth: true, data: [15, 22, 18, 32, 25, 10, 8], color: '#667eea' },
      ]
    };
    myChart.setOption(option);
  }
}
