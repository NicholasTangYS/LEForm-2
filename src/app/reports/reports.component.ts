import { Component, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { baseUrl } from '../../environments/environment';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TopupModalComponent } from '../topup-modal/topup-modal.component';
import { DialogService } from '../dialog.service';

interface Project {
  ID: number;
  name: string;
  status: string | number;
  year_end: string;
  created_on: string;
  updated_on: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  userID: any;
  private apiUrl = baseUrl;
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  paginatedProjects: Project[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  itemsPerPageOptions = [5, 10, 25, 50];
  creditBalance: number = 0;
  isLoadingBalance: boolean = false;

  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient,
    private dialog: MatDialog,
    private dialogService: DialogService
  ) {
    effect(() => {
      this.userID = this.auth.getUserId();
      if (this.userID) {
        this.getProjects();
        this.loadCreditBalance();
      }
    });
  }

  ngOnInit(): void { }

  getProjects(): void {
    this.http.get<Project[]>(`${this.apiUrl}/getProjectByUser/${this.userID}`).subscribe(
      (data) => {
        this.projects = data.map(project => {
          // Assuming the date field is called 'dueDate'
          if (project.year_end && typeof project.year_end === 'string') {

            // The split() method creates an array ['2024-12-31', '00:00:00.000Z']
            // We take the first element [0]
            project.year_end = project.year_end.split('T')[0];
          }
          return project;
        });
        this.filterAndPaginateProjects();
      },
      (error) => {
        console.error('Error fetching projects:', error);
      }
    );
  }

  filterAndPaginateProjects(): void {
    // Filter projects by search term and status
    this.filteredProjects = this.projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.statusFilter === 'all' || project.status.toString() === this.statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Paginate the filtered projects
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProjects = this.filteredProjects.slice(startIndex, endIndex);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.filterAndPaginateProjects();
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.filterAndPaginateProjects();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.filterAndPaginateProjects();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProjects.length / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStatusLabel(status: any): string {
    const s = status.toString();
    if (s === '2') return 'Complete';
    if (s === '1') return 'In Progress';
    return s;
  }

  getStatusClass(status: any): string {
    const s = status.toString();
    if (s === '2') return 'status-complete';
    if (s === '1') return 'status-in-progress';
    return 'status-unknown';
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.filterAndPaginateProjects();
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
    // Navigate to the component for creating a new report
    this.router.navigate(['/home']);
  }

  editReport(project: Project): void {
    this.auth.setProjectId(project.ID);
    this.router.navigate(['/form']);
    // Navigate to the component for editing a report, passing the project ID
    // this.router.navigate(['/edit-report', project.name]);
  }

  loadCreditBalance(): void {
    if (!this.userID) return;

    this.isLoadingBalance = true;
    this.http.get<any>(`${this.apiUrl}/api/credits/balance/${this.userID}`).subscribe({
      next: (response) => {
        this.creditBalance = parseFloat(response.balance);
        this.isLoadingBalance = false;
      },
      error: (error) => {
        console.error('Error loading credit balance:', error);
        this.creditBalance = 0;
        this.isLoadingBalance = false;
      }
    });
  }

  openTopUpModal(): void {
    const dialogRef = this.dialog.open(TopupModalComponent, {
      width: '600px',
      data: {
        userId: this.userID,
        currentBalance: this.creditBalance
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Reload balance after successful purchase
        this.loadCreditBalance();
      }
    });
  }
}