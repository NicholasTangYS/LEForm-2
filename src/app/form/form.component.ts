// src/app/form/form.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { forkJoin, lastValueFrom } from 'rxjs';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent implements OnInit {
  le1Form: FormGroup;
  initialFormData: any;
  isLoading: boolean = false;
  sidebarOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    // Initialize an empty form group. It will be populated dynamically.
    this.le1Form = this.fb.group({
      // Part A: Basic Particulars
      Year_of_Assessment_1: [''],
      Year_of_Assessment_2: [''],
      Year_of_Assessment_3: [''],
      Year_of_Assessment_4: [''],
      Company_Name: [''],
      Company_Address_Line1: [''],
      Company_Address_Line2: [''],
      Postcode: [''],
      City: [''],
      State: [''],
      Company_Registration_No: [''],
      Company_TIN_LE: [''],
      TIN_C_or_PT: [''],
      Employer_TIN: [''],
      Incorp_date_day: [''],
      Incorp_date_month: [''],
      Incorp_date_year: [''],
      Telephone_no: [''],
      Email: [''],
      Change_of_Accounting_Period_No: [''],
      Types_of_exchange_of_accounting_periods: [''],
      Accounting_Period_From_Day: [''],
      Accounting_Period_From_Month: [''],
      Accounting_Period_From_Year: [''],
      Accounting_Period_To_Day: [''],
      Accounting_Period_To_Month: [''],
      Accounting_Period_To_Year: [''],
      Basis_Period_From_Day: [''],
      Basis_Period_From_Month: [''],
      Basis_Period_From_Year: [''],
      Basis_Period_To_Day: [''],
      Basis_Period_To_Month: [''],
      Basis_Period_To_Year: [''],
      FS_in_Foreign_Currency_Yes: [''],
      Currency_Reported: [''],
      Currency_Exchange_Rate: [''],
      Record_keeping: [''],
      Business_Status_In_Operation: [''],
      Type_of_Labuan_entity: [''],
      Incorp_under: [''],

      // Part B: Tax Computation
      // B1 Row 1
      B1_Row1_Business_Activity_Code: [''],
      B1_Row1_Core_Income_Activity_Yes: [''],
      B1_Row1_Business_Activity_Status_Active: [''],
      B1_Row1_No_of_Employees: [''],
      B1_Row1_Annual_Operating_Expenditure: [''],
      B1_Row1_Compliance_with_FPEC: [''],
      B1_Row1_Compliance_with_CML: [''],
      B1_Row1_No_of_Employees_Malaysia: [''],
      B1_Row1_No_of_Related_Company: [''],
      B1_Row1_Comply_Substantive_Yes: [''],
      B1_Row1_Amount_of_Net_Loss: [''],
      B1_Row1_Net_Profits_ex_IP: [''],
      B1_Row2_Business_Activity_Code: [''],
      B1_Row2_Core_Income_Activity_Yes: [''],
      B1_Row2_Business_Activity_Status_Active: [''],
      B1_Row2_No_of_Employees: [''],
      B1_Row2_Annual_Operating_Expenditure: [''],
      B1_Row2_Compliance_with_FPEC: [''],
      B1_Row2_Compliance_with_CML: [''],
      B1_Row2_No_of_Employees_Malaysia: [''],
      B1_Row2_No_of_Related_Company: [''],
      B1_Row2_Comply_Substantive_Yes: [''],
      B1_Row2_Amount_of_Net_Loss: [''],
      B1_Row2_Net_Profits_ex_IP: [''],
      B1_Row3_Business_Activity_Code: [''],
      B1_Row3_Core_Income_Activity_Yes: [''],
      B1_Row3_Business_Activity_Status_Active: [''],
      B1_Row3_No_of_Employees: [''],
      B1_Row3_Annual_Operating_Expenditure: [''],
      B1_Row3_Compliance_with_FPEC: [''],
      B1_Row3_Compliance_with_CML: [''],
      B1_Row3_No_of_Employees_Malaysia: [''],
      B1_Row3_No_of_Related_Company: [''],
      B1_Row3_Comply_Substantive_Yes: [''],
      B1_Row3_Amount_of_Net_Loss: [''],
      B1_Row3_Net_Profits_ex_IP: [''],
      B1_Row4_Business_Activity_Code: [''],
      B1_Row4_Core_Income_Activity_Yes: [''],
      B1_Row4_Business_Activity_Status_Active: [''],
      B1_Row4_No_of_Employees: [''],
      B1_Row4_Annual_Operating_Expenditure: [''],
      B1_Row4_Compliance_with_FPEC: [''],
      B1_Row4_Compliance_with_CML: [''],
      B1_Row4_No_of_Employees_Malaysia: [''],
      B1_Row4_No_of_Related_Company: [''],
      B1_Row4_Comply_Substantive_Yes: [''],
      B1_Row4_Amount_of_Net_Loss: [''],
      B1_Row4_Net_Profits_ex_IP: [''],
      B1_Row5_Business_Activity_Code: [''],
      B1_Row5_Core_Income_Activity_Yes: [''],
      B1_Row5_Business_Activity_Status_Active: [''],
      B1_Row5_No_of_Employees: [''],
      B1_Row5_Annual_Operating_Expenditure: [''],
      B1_Row5_Compliance_with_FPEC: [''],
      B1_Row5_Compliance_with_CML: [''],
      B1_Row5_No_of_Employees_Malaysia: [''],
      B1_Row5_No_of_Related_Company: [''],
      B1_Row5_Comply_Substantive_Yes: [''],
      B1_Row5_Amount_of_Net_Loss: [''],
      B1_Row5_Net_Profits_ex_IP: [''],
      B2_Total_Net_Profits: [''],
      B3a_Chargeable_Profit_0_Percent: [''],
      B3b_Chargeable_Profit_3_Percent: [''],
      B3c_Chargeable_Profit_24_Percent: [''],
      B4_Tax_Charged: [''],
      B5_Zakat_Paid: [''],
      B6_Tax_Payable: [''],

      // Part C: Entity Details
      C1_Correspondence_Address_line1: [''],
      C1_Correspondence_Address_line2: [''],
      C1_Postcode: [''],
      C1_City: [''],
      C1_State: [''],
      C1_Country: [''],
      C2_Address_Is_Tax_Agent_or_Trust_Co: [''],
      C6a_Has_Related_Company: [''],
      C6b_Number_of_Related_Companies_Qualifying_Activity: [''],
      C7a_Derived_Income_from_Non_Labuan_Activity: [''],
      C7b_Total_Income_from_Non_Labuan_Activity: [''],
      C8a_Derived_Income_from_IP: [''],
      C8b_Total_Income_from_IP: [''],
      C10_Has_Subsidiary_Outside_Labuan: [''],
      C11_Received_Payments_from_Malaysian_Resident: [''],
      C12_Row1_Incentive_Code: [''],
      C12_Row1_Amount_Claimed: [''],
      C12_Row2_Incentive_Code: [''],
      C12_Row2_Amount_Claimed: [''],
      C12_Row3_Incentive_Code: [''],
      C12_Row3_Amount_Claimed: [''],
      // Part D: CbC Reporting
      D1_Subject_to_CbCR: [''],
      D2_Reporting_Entity_Status: [''],
      D3_Has_Financial_Account_Outside_Malaysia: [''],
      D4_Subject_to_AEOI: [''],


      // Part E: Reporting Entity
      E1_MNE_Group_Name: [''],
      E2_Accounting_Period_From_Day: [''],
      E2_Accounting_Period_From_Month: [''],
      E2_Accounting_Period_From_Year: [''],
      E2_Accounting_Period_To_Day: [''],
      E2_Accounting_Period_To_Month: [''],
      E2_Accounting_Period_To_Year: [''],
      E3_Constituent_Entities_in_Malaysia: [''],
      E4_Constituent_Entities_outside_Malaysia: [''],

      // Part F: Non-Reporting Entity
      F1_Reporting_Entity_Name: [''],
      F2_TIN: [''],
      F3_Country_of_Residence: [''],
      F4_Accounting_Period_From_Day: [''],
      F4_Accounting_Period_From_Month: [''],
      F4_Accounting_Period_From_Year: [''],
      F4_Accounting_Period_To_Day: [''],
      F4_Accounting_Period_To_Month: [''],
      F4_Accounting_Period_To_Year: [''],
      F5_MNE_Group_Name: [''],
      F6_Status_of_Reporting_Entity: [''],
      F7a_Ultimate_Holding_Entity_Name: [''],
      F7b_Country_of_Residence_UHE: [''],

      // Declaration
      Declarant_Name: [''],
      Declarant_ID_Passport: [''],
      Declaration_Date_Day: [''],
      Declaration_Date_Month: [''],
      Declaration_Date_Year: [''],
      Declarant_Designation: [''],
      Designation_Others: [''],

      // Attachment C3: Compliance Officers
      // C3 Row 1
      Compliance_Officers_0_Name: [''],
      Compliance_Officers_0_Claim_PUA_419_2011: [''],
      Compliance_Officers_0_Designation: [''],
      Compliance_Officers_0_Address: [''],
      Compliance_Officers_0_ID_Passport_No: [''],
      Compliance_Officers_0_Date_of_Birth: [''],
      Compliance_Officers_0_TIN: [''],
      Compliance_Officers_0_Telephone_No: [''],
      Compliance_Officers_0_Salary_Bonus: [''],
      Compliance_Officers_0_Fees_Commission_Allowances: [''],
      Compliance_Officers_0_Total_Loan_to_Officer: [''],
      Compliance_Officers_0_Total_Loan_from_Officer: [''],
      // C3 Row 2
      Compliance_Officers_1_Name: [''],
      Compliance_Officers_1_Claim_PUA_419_2011: [''],
      Compliance_Officers_1_Designation: [''],
      Compliance_Officers_1_Address: [''],
      Compliance_Officers_1_ID_Passport_No: [''],
      Compliance_Officers_1_Date_of_Birth: [''],
      Compliance_Officers_1_TIN: [''],
      Compliance_Officers_1_Telephone_No: [''],
      Compliance_Officers_1_Salary_Bonus: [''],
      Compliance_Officers_1_Fees_Commission_Allowances: [''],
      Compliance_Officers_1_Total_Loan_to_Officer: [''],
      Compliance_Officers_1_Total_Loan_from_Officer: [''],
      // C3 Row 3
      Compliance_Officers_2_Name: [''],
      Compliance_Officers_2_Claim_PUA_419_2011: [''],
      Compliance_Officers_2_Designation: [''],
      Compliance_Officers_2_Address: [''],
      Compliance_Officers_2_ID_Passport_No: [''],
      Compliance_Officers_2_Date_of_Birth: [''],
      Compliance_Officers_2_TIN: [''],
      Compliance_Officers_2_Telephone_No: [''],
      Compliance_Officers_2_Salary_Bonus: [''],
      Compliance_Officers_2_Fees_Commission_Allowances: [''],
      Compliance_Officers_2_Total_Loan_to_Officer: [''],
      Compliance_Officers_2_Total_Loan_from_Officer: [''],
      // C3 Row 4
      Compliance_Officers_3_Name: [''],
      Compliance_Officers_3_Claim_PUA_419_2011: [''],
      Compliance_Officers_3_Designation: [''],
      Compliance_Officers_3_Address: [''],
      Compliance_Officers_3_ID_Passport_No: [''],
      Compliance_Officers_3_Date_of_Birth: [''],
      Compliance_Officers_3_TIN: [''],
      Compliance_Officers_3_Telephone_No: [''],
      Compliance_Officers_3_Salary_Bonus: [''],
      Compliance_Officers_3_Fees_Commission_Allowances: [''],
      Compliance_Officers_3_Total_Loan_to_Officer: [''],
      Compliance_Officers_3_Total_Loan_from_Officer: [''],
      // C3 Row 5
      Compliance_Officers_4_Name: [''],
      Compliance_Officers_4_Claim_PUA_419_2011: [''],
      Compliance_Officers_4_Designation: [''],
      Compliance_Officers_4_Address: [''],
      Compliance_Officers_4_ID_Passport_No: [''],
      Compliance_Officers_4_Date_of_Birth: [''],
      Compliance_Officers_4_TIN: [''],
      Compliance_Officers_4_Telephone_No: [''],
      Compliance_Officers_4_Salary_Bonus: [''],
      Compliance_Officers_4_Fees_Commission_Allowances: [''],
      Compliance_Officers_4_Total_Loan_to_Officer: [''],
      Compliance_Officers_4_Total_Loan_from_Officer: [''],

      // Attachment C4: Major Shareholders
      // C4 Row 1
      Major_Shareholders_0_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_0_Address: [''],
      Major_Shareholders_0_ID_Passport_Reg_No: [''],
      Major_Shareholders_0_Date_of_Birth: [''],
      Major_Shareholders_0_Country_of_Origin: [''],
      Major_Shareholders_0_TIN: [''],
      Major_Shareholders_0_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_0_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 2
      Major_Shareholders_1_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_1_Address: [''],
      Major_Shareholders_1_ID_Passport_Reg_No: [''],
      Major_Shareholders_1_Date_of_Birth: [''],
      Major_Shareholders_1_Country_of_Origin: [''],
      Major_Shareholders_1_TIN: [''],
      Major_Shareholders_1_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_1_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 3
      Major_Shareholders_2_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_2_Address: [''],
      Major_Shareholders_2_ID_Passport_Reg_No: [''],
      Major_Shareholders_2_Date_of_Birth: [''],
      Major_Shareholders_2_Country_of_Origin: [''],
      Major_Shareholders_2_TIN: [''],
      Major_Shareholders_2_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_2_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 4
      Major_Shareholders_3_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_3_Address: [''],
      Major_Shareholders_3_ID_Passport_Reg_No: [''],
      Major_Shareholders_3_Date_of_Birth: [''],
      Major_Shareholders_3_Country_of_Origin: [''],
      Major_Shareholders_3_TIN: [''],
      Major_Shareholders_3_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_3_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 5
      Major_Shareholders_4_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_4_Address: [''],
      Major_Shareholders_4_ID_Passport_Reg_No: [''],
      Major_Shareholders_4_Date_of_Birth: [''],
      Major_Shareholders_4_Country_of_Origin: [''],
      Major_Shareholders_4_TIN: [''],
      Major_Shareholders_4_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_4_Dividends_Received_in_Basis_Period: [''],

      // Attachment C5: Beneficial Owners
      // C5 Row 1
      Beneficial_Owner_0_Name: [''],
      Beneficial_Owner_0_TIN: [''],
      Beneficial_Owner_0_Shareholding_Percentage: [''],
      Beneficial_Owner_0_Salary_Bonus: [''],
      Beneficial_Owner_0_Dividends_Received_in_Basis_Period: [''],
      Beneficial_Owner_0_Total_Loan_from_Owner: [''],
      Beneficial_Owner_0_Total_Loan_to_Owner: [''],
      Beneficial_Owner_0_Address: [''],
      Beneficial_Owner_0_ID_Passport_No: [''],
      Beneficial_Owner_0_Date_of_Birth: [''],
      Beneficial_Owner_0_Telephone_No: [''],
      Beneficial_Owner_0_Fees_Commission_Allowance: [''],


      // C5 Row 2
      Beneficial_Owner_1_Name: [''],
      Beneficial_Owner_1_TIN: [''],
      Beneficial_Owner_1_Shareholding_Percentage: [''],
      Beneficial_Owner_1_Salary_Bonus: [''],
      Beneficial_Owner_1_Dividends_Received_in_Basis_Period: [''],
      Beneficial_Owner_1_Total_Loan_from_Owner: [''],
      Beneficial_Owner_1_Total_Loan_to_Owner: [''],
      Beneficial_Owner_1_Address: [''],
      Beneficial_Owner_1_ID_Passport_No: [''],
      Beneficial_Owner_1_Date_of_Birth: [''],
      Beneficial_Owner_1_Telephone_No: [''],
      Beneficial_Owner_1_Fees_Commission_Allowance: [''],
      // C5 Row 3
      Beneficial_Owner_2_Name: [''],
      Beneficial_Owner_2_TIN: [''],
      Beneficial_Owner_2_Shareholding_Percentage: [''],
      Beneficial_Owner_2_Salary_Bonus: [''],
      Beneficial_Owner_2_Dividends_Received_in_Basis_Period: [''],
      Beneficial_Owner_2_Total_Loan_from_Owner: [''],
      Beneficial_Owner_2_Total_Loan_to_Owner: [''],
      Beneficial_Owner_2_Address: [''],
      Beneficial_Owner_2_ID_Passport_No: [''],
      Beneficial_Owner_2_Date_of_Birth: [''],
      Beneficial_Owner_2_Telephone_No: [''],
      Beneficial_Owner_2_Fees_Commission_Allowance: [''],
      // C5 Row 4
      Beneficial_Owner_3_Name: [''],
      Beneficial_Owner_3_TIN: [''],
      Beneficial_Owner_3_Shareholding_Percentage: [''],
      Beneficial_Owner_3_Salary_Bonus: [''],
      Beneficial_Owner_3_Dividends_Received_in_Basis_Period: [''],
      Beneficial_Owner_3_Total_Loan_from_Owner: [''],
      Beneficial_Owner_3_Total_Loan_to_Owner: [''],
      Beneficial_Owner_3_Address: [''],
      Beneficial_Owner_3_ID_Passport_No: [''],
      Beneficial_Owner_3_Date_of_Birth: [''],
      Beneficial_Owner_3_Telephone_No: [''],
      Beneficial_Owner_3_Fees_Commission_Allowance: [''],
      // C5 Row 5
      Beneficial_Owner_4_Name: [''],
      Beneficial_Owner_4_TIN: [''],
      Beneficial_Owner_4_Shareholding_Percentage: [''],
      Beneficial_Owner_4_Salary_Bonus: [''],
      Beneficial_Owner_4_Dividends_Received_in_Basis_Period: [''],
      Beneficial_Owner_4_Total_Loan_from_Owner: [''],
      Beneficial_Owner_4_Total_Loan_to_Owner: [''],
      Beneficial_Owner_4_Address: [''],
      Beneficial_Owner_4_ID_Passport_No: [''],
      Beneficial_Owner_4_Date_of_Birth: [''],
      Beneficial_Owner_4_Telephone_No: [''],
      Beneficial_Owner_4_Fees_Commission_Allowance: [''],

      // Attachment C9: Financial Particulars
      Business_Activity_Code: [''],
      Type_of_business_activity: [''],
      Fp_Type_of_Labuan_entity: [''],
      Pnl_Sales_Turnover: [''],
      Pnl_Opening_Inventory: [''],
      Pnl_Cost_of_Purchases: [''],
      Pnl_Cost_of_Production: [''],
      Pnl_Closing_Inventory: [''],
      Pnl_Cost_of_Sales: [''],
      Pnl_Gross_Profit_Loss: [''],
      Pnl_Foreign_Currency_Exchange_Gain: [''],
      Pnl_Other_Business_Income: [''],
      Pnl_Other_Income: [''],
      Pnl_Non_Taxable_Profits: [''],
      Pnl_Interest_Expenditure: [''],
      Pnl_Professional_Fees: [''],
      Pnl_Technical_Fees_to_Non_Residents: [''],
      Pnl_Contract_Payments: [''],
      Pnl_Management_Fee: [''],
      Pnl_Salaries_Wages: [''],
      Pnl_Cost_of_Employee_Share_Options: [''],
      Pnl_Royalties: [''],
      Pnl_Rental_Lease: [''],
      Pnl_Maintenance_Repairs: [''],
      Pnl_Research_Development: [''],
      Pnl_Promotion_Advertisement: [''],
      Pnl_Travelling_Accommodation: [''],
      Pnl_Foreign_Currency_Exchange_Loss: [''],
      Pnl_Other_Expenditure: [''],
      Pnl_Total_Expenditure: [''],
      Pnl_Net_Profit_Loss: [''],
      Fp_Motor_Vehicles: [''],
      Fp_Plant_Equipment: [''],
      Fp_Land_Buildings: [''],
      Fp_Other_Non_Current_Assets: [''],
      Fp_Investments: [''],
      Fp_Total_Non_Current_Assets: [''],
      Fp_Cost_of_NCA_Acquired: [''],
      Fp_Trade_Debtors: [''],
      Fp_Other_Debtors: [''],
      Fp_Inventory: [''],
      Fp_Loans_to_Related_Entities: [''],
      Fp_Cash_in_Hand_Bank: [''],
      Fp_Other_Current_Assets: [''],
      Fp_Total_Current_Assets: [''],
      Fp_Total_Assets: [''],
      Fp_Loans_Bank_Overdrafts: [''],
      Fp_Trade_Creditors: [''],
      Fp_Other_Creditors: [''],
      Fp_Loans_from_Related_Entities: [''],
      Fp_Other_Current_Liabilities: [''],
      Fp_Total_Current_Liabilities: [''],
      Fp_Non_Current_Liabilities: [''],
      Fp_Total_Liabilities: [''],
      Fp_Issued_Paid_Up_Capital: [''],
      Fp_Profit_Loss_Appropriation: [''],
      Fp_Reserve_Account: [''],
      Fp_Total_Equity: [''],
      Fp_Total_Liabilities_and_Equity: [''],

      // Attachment C10: Subsidiaries or Related Entities
      // C10 Row 1
      Name1: [''],
      Registration_No1: [''],
      TIN1: [''],
      Have_Transactions1: [''],

      Name2: [''],
      Registration_No2: [''],
      TIN2: [''],
      Have_Transactions2: [''],

      Name3: [''],
      Registration_No3: [''],
      TIN3: [''],
      Have_Transactions3: [''],

      Name4: [''],
      Registration_No4: [''],
      TIN4: [''],
      Have_Transactions4: [''],

      Name5: [''],
      Registration_No5: [''],
      TIN5: [''],
      Have_Transactions5: [''],

      // Attachment C11: Payments Received from Malaysian Residents
      // C11 Row 1
      Payments_From_Malaysian_Residents_0_Name_of_taxpayer: [''],
      Payments_From_Malaysian_Residents_0_TIN: [''],
      Payments_From_Malaysian_Residents_0_Type_of_payment_received: [''],
      Payments_From_Malaysian_Residents_0_Amount: [''],
      // C11 Row 2
      Payments_From_Malaysian_Residents_1_Name_of_taxpayer: [''],
      Payments_From_Malaysian_Residents_1_TIN: [''],
      Payments_From_Malaysian_Residents_1_Type_of_payment_received: [''],
      Payments_From_Malaysian_Residents_1_Amount: [''],
      // C11 Row 3
      Payments_From_Malaysian_Residents_2_Name_of_taxpayer: [''],
      Payments_From_Malaysian_Residents_2_TIN: [''],
      Payments_From_Malaysian_Residents_2_Type_of_payment_received: [''],
      Payments_From_Malaysian_Residents_2_Amount: [''],
      // C11 Row 4
      Payments_From_Malaysian_Residents_3_Name_of_taxpayer: [''],
      Payments_From_Malaysian_Residents_3_TIN: [''],
      Payments_From_Malaysian_Residents_3_Type_of_payment_received: [''],
      Payments_From_Malaysian_Residents_3_Amount: [''],
      // C11 Row 5
      Payments_From_Malaysian_Residents_4_Name_of_taxpayer: [''],
      Payments_From_Malaysian_Residents_4_TIN: [''],
      Payments_From_Malaysian_Residents_4_Type_of_payment_received: [''],
      Payments_From_Malaysian_Residents_4_Amount: [''],
    });
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['formData']) {
      this.initialFormData = navigation.extras.state['formData'];
    } else {
      console.warn('No form data received. Redirecting to home.');
      // Uncomment the line below to redirect if no data is present
      // this.router.navigate(['/home']);
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  ngOnInit(): void {
    // if (this.initialFormData) {
    //   // Dynamically create form controls based on the keys in the received data
    //   const formControls: { [key: string]: any } = {};
    //   for (const key in this.initialFormData) {
    //     if (Object.prototype.hasOwnProperty.call(this.initialFormData, key)) {
    //       formControls[key] = [this.initialFormData[key] || ''];
    //     }
    //   }
    //   this.le1Form = this.fb.group(formControls);
    //   console.log('Form initialized with data:', this.le1Form.value);
    // }
    if (this.initialFormData) {
      // Use patchValue. It safely fills in the values for matching controls
      // and ignores any properties in initialFormData that don't have a control.
      this.le1Form.patchValue(this.initialFormData);
      console.log('Form initialized and patched with data:', this.le1Form.value);
    }

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        const element = document.querySelector('#' + fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', inline:'nearest' });
        }
      }
    });
  }

  async generatePdf(): Promise<void> {
    if (this.le1Form.invalid) {
      // This check is basic. Add more specific validation as needed.
      alert('The form is invalid. Please check all fields.');
      return;
    }
    this.isLoading = true;

    try {
      // Load PDF template and mapping file from the assets folder
      const assets = await lastValueFrom(forkJoin({
        pdfTemplateBytes: this.http.get('contohbn_le1-2025-asas-tahun-semasa-_1 (2) (1) (1).pdf', { responseType: 'arraybuffer' }),
        mapping: this.http.get<any>('data_mapping.json')
      }));

      const { pdfTemplateBytes, mapping } = assets;

      if (!pdfTemplateBytes || !mapping) {
        throw new Error("Failed to load PDF assets from the 'assets' folder.");
      }

      const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
      const pages = pdfDoc.getPages();
      console.log(pages)
      const formValues = this.le1Form.value;
      console.log('Form values to populate PDF:', formValues);

      for (const fieldName in mapping) {
        if (Object.prototype.hasOwnProperty.call(mapping, fieldName)) {
          const coords = mapping[fieldName];
          const value = formValues[fieldName];
          console.log(coords, value);
          // Check if a value exists for the field
          if (value !== null && value !== undefined) {
            // Adjust the page index to be zero-based for pdf-lib
            const pageIndex = coords.page;

            if (pageIndex >= 0 && pageIndex < pages.length) {
              const page = pages[pageIndex];

              page.drawText(String(value), {
                x: coords.x,
                y: coords.y,
                size: coords.size || 12,
              });
            } else {
              console.warn(`Invalid page index for field '${fieldName}': page ${coords.page}`);
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();

      // Type assertion to treat the buffer as a plain ArrayBuffer
      const arrayBuffer = pdfBytes.buffer as ArrayBuffer;

      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      saveAs(blob, 'LE1_completed.pdf');

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('An error occurred while generating the PDF. Check the console for details.');
    } finally {
      this.isLoading = false;
    }
  }
}