import { Component, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { baseUrl } from '../../environments/environment';

interface Project {
  ID: number;
  name: string;
  status: string;
  year_end: string;
  created_on: string;
  updated_on: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  currentPage: number = 1;
  itemsPerPage: number = 10;
  itemsPerPageOptions = [5, 10, 25, 50];

  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient
  ) {
    effect(() => {
      this.userID = this.auth.getUserId();
      if (this.userID) {
        this.getProjects();
      }
    });
  }

  ngOnInit(): void {}

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
    // Filter projects by search term
    this.filteredProjects = this.projects.filter((project) =>
      project.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

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

  createNewReport(): void {
    // Navigate to the component for creating a new report
    this.router.navigate(['/home']);
  }

  editReport(project: Project): void {
     this.auth.setProjectId(project.ID);
     this.router.navigate(['/form']);
    // Navigate to the component for editing a report, passing the project ID
    // this.router.navigate(['/edit-report', project.name]);
  }
}