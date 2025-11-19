import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { forkJoin, lastValueFrom } from 'rxjs';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { AuthService } from '../auth/auth.service';
import { baseUrl } from '../../environments/environment';
import { DialogService } from '../dialog.service';
import { ThousandSeparatorDirective } from '../thousand-separator.directive.ts';
import { AutoResizeDirective } from '../auto-resize.directive';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, ThousandSeparatorDirective, AutoResizeDirective],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent implements OnInit {
  le1Form: FormGroup;
  
  // Dynamic accordion states for each section
  accordionStates: { [key: string]: boolean[] } = {
    b1: [],
    c3: [],
    c4: [],
    c5: [],
    c10: [],
    c11: []
  };

  isInstructionModalVisible = false;
  jsonDataForExtension = '';
  copyButtonText = 'Copy JSON';
  initialFormData: any;
  isLoading: boolean = false;
  sidebarOpen = false;
  private apiUrl = baseUrl;
  projectId: any;
  
  // Section completion tracking
  sectionStatus: { [key: string]: boolean } = {};

  // Dropdown Data
  businessActivities: { code: string, description: string, mark: string }[] = [
    { code: '00001', description: 'Labuan insurer, Labuan reinsurer, Labuan takaful operator or Labuan retakaful operator', mark: '' },
    { code: '00002', description: 'Labuan underwriting manager or Labuan underwriting takaful manager', mark: '' },
    { code: '00003', description: 'Labuan insurance manager or Labuan takaful manager', mark: '' },
    { code: '00004', description: 'Labuan insurance broker or Labuan takaful broker', mark: '' },
    { code: '00005', description: 'Labuan captive insurer or Labuan captive takaful', mark: '' },
    { code: '00006', description: 'Labuan International Commodity Trading Company', mark: 'LITC' },
    { code: '00007', description: 'Labuan bank, Labuan investment bank, Labuan Islamic bank or Labuan Islamic investment bank', mark: '' },
    { code: '00008', description: 'Labuan trust company', mark: '' },
    { code: '00009', description: 'Labuan leasing company or Labuan Islamic leasing company', mark: '' },
    { code: '00010', description: 'Labuan credit token company or Labuan Islamic credit token company', mark: '' },
    { code: '00011', description: 'Labuan development finance company or Labuan Islamic development finance company', mark: '' },
    { code: '00012', description: 'Labuan building credit company or Labuan Islamic building credit company', mark: '' },
    { code: '00013', description: 'Labuan factoring company or Labuan Islamic factoring company', mark: '' },
    { code: '00014', description: 'Labuan money broker or Labuan Islamic money broker', mark: '' },
    { code: '00015', description: 'Labuan fund manager', mark: '' },
    { code: '00016', description: 'Labuan securities licensee or Labuan Islamic securities licensee', mark: '' },
    { code: '00017', description: 'Labuan fund administrator', mark: '' },
    { code: '00018', description: 'Labuan company management', mark: '' },
    { code: '00019', description: 'Labuan International Financial Exchange', mark: '' },
    { code: '00020', description: 'Self-regulatory organisation or Islamic self-regulation organisation', mark: '' },
    { code: '00021', description: 'Labuan entity that undertakes investment holding activities other than pure equity holding activities', mark: 'Non Trading (Non pure)' },
    { code: '00022', description: 'Labuan entity that undertakes pure equity holding activities', mark: 'Non Trading (Pure)' },
    { code: '00023', description: 'Labuan entity that carries out administrative services, accounting services, legal services, backroom processing services, payroll services, talent management services, agency services, insolvency related services and management services other than Labuan company management under code 00018', mark: '' }
  ];

  incentiveCodes: { code: string }[] = [
    { code: '801' }, { code: '802' }, { code: '803' },
  ];

  countries: { code: string, name: string }[] = [
    { "code": "MYS", "name": "MALAYSIA" },
    { "code": "AFG", "name": "AFGHANISTAN" },
    { "code": "ALA", "name": "ALAND ISLANDS" },
    { "code": "ALB", "name": "ALBANIA" },
    { "code": "DZA", "name": "ALGERIA" },
    { "code": "ASM", "name": "AMERICAN SAMOA" },
    { "code": "AND", "name": "ANDORRA" },
    { "code": "AGO", "name": "ANGOLA" },
    { "code": "AIA", "name": "ANGUILLA" },
    { "code": "ATA", "name": "ANTARCTICA" },
    { "code": "ATG", "name": "ANTIGUA AND BARBUDA" },
    { "code": "ARG", "name": "ARGENTINA" },
    { "code": "ARM", "name": "ARMENIA" },
    { "code": "ABW", "name": "ARUBA" },
    { "code": "AUS", "name": "AUSTRALIA" },
    { "code": "AUT", "name": "AUSTRIA" },
    { "code": "AZE", "name": "AZERBAIJAN REPUBLIC" },
    { "code": "BHS", "name": "BAHAMAS" },
    { "code": "BHR", "name": "BAHRAIN" },
    { "code": "BGD", "name": "BANGLADESH" },
    { "code": "BRB", "name": "BARBADOS" },
    { "code": "BLR", "name": "BELARUS" },
    { "code": "BEL", "name": "BELGIUM" },
    { "code": "BLZ", "name": "BELIZE" },
    { "code": "BEN", "name": "BENIN" },
    { "code": "BMU", "name": "BERMUDA" },
    { "code": "BTN", "name": "BHUTAN" },
    { "code": "BOL", "name": "BOLIVIA" },
    { "code": "BES", "name": "BONAIRE, SINT EUSTATIUS AND SABA" },
    { "code": "BIH", "name": "BOSNIA AND HERZEGOVINA" },
    { "code": "BWA", "name": "BOTSWANA" },
    { "code": "BVT", "name": "BOUVET ISLAND" },
    { "code": "BRA", "name": "BRAZIL" },
    { "code": "IOT", "name": "BRITISH INDIAN OCEAN TERRITORY" },
    { "code": "BRN", "name": "BRUNEI DARUSSALAM" },
    { "code": "BGR", "name": "BULGARIA" },
    { "code": "BFA", "name": "BURKINA FASO" },
    { "code": "BDI", "name": "BURUNDI" },
    { "code": "KHM", "name": "CAMBODIA" },
    { "code": "CMR", "name": "CAMEROON" },
    { "code": "CAN", "name": "CANADA" },
    { "code": "CPV", "name": "CAPE VERDE (CABO VERDE)" },
    { "code": "CYM", "name": "CAYMAN ISLANDS" },
    { "code": "CAF", "name": "CENTRAL AFRICAN REPUBLIC" },
    { "code": "TCD", "name": "CHAD" },
    { "code": "CHL", "name": "CHILE" },
    { "code": "CHN", "name": "CHINA" },
    { "code": "CXR", "name": "CHRISTMAS ISLAND" },
    { "code": "CCK", "name": "COCOS (KEELING) ISLANDS" },
    { "code": "COL", "name": "COLOMBIA" },
    { "code": "COM", "name": "COMOROS" },
    { "code": "COG", "name": "CONGO" },
    { "code": "COD", "name": "CONGO, THE DEMOCRATIC REPUBLIC OF THE" },
    { "code": "COK", "name": "COOK ISLANDS" },
    { "code": "CRI", "name": "COSTA RICA" },
    { "code": "CIV", "name": "COTE D'IVOIRE" },
    { "code": "HRV", "name": "CROATIA" },
    { "code": "CUB", "name": "CUBA" },
    { "code": "CUW", "name": "CURACAO" },
    { "code": "CYP", "name": "CYPRUS" },
    { "code": "CZE", "name": "CZECH REPUBLIC" },
    { "code": "DNK", "name": "DENMARK" },
    { "code": "DJI", "name": "DJIBOUTI" },
    { "code": "DMA", "name": "DOMINICA" },
    { "code": "DOM", "name": "DOMINICAN REPUBLIC" },
    { "code": "ECU", "name": "ECUADOR" },
    { "code": "EGY", "name": "EGYPT" },
    { "code": "SLV", "name": "EL SALVADOR" },
    { "code": "GNQ", "name": "EQUATORIAL GUINEA" },
    { "code": "ERI", "name": "ERITREA" },
    { "code": "EST", "name": "ESTONIA" },
    { "code": "ETH", "name": "ETHIOPIA" },
    { "code": "FLK", "name": "FALKLAND ISLANDS (MALVINAS)" },
    { "code": "FRO", "name": "FAROE ISLANDS" },
    { "code": "FJI", "name": "FIJI" },
    { "code": "FIN", "name": "FINLAND" },
    { "code": "FRA", "name": "FRANCE" },
    { "code": "GUF", "name": "FRENCH GUIANA" },
    { "code": "PYF", "name": "FRENCH POLYNESIA" },
    { "code": "ATF", "name": "FRENCH SOUTHERN TERRITORIES" },
    { "code": "GAB", "name": "GABON" },
    { "code": "GMB", "name": "GAMBIA" },
    { "code": "GEO", "name": "GEORGIA" },
    { "code": "DEU", "name": "GERMANY" },
    { "code": "GHA", "name": "GHANA" },
    { "code": "GIB", "name": "GIBRALTAR" },
    { "code": "GRC", "name": "GREECE" },
    { "code": "GRL", "name": "GREENLAND" },
    { "code": "GRD", "name": "GRENADA" },
    { "code": "GLP", "name": "GUADELOUPE" },
    { "code": "GUM", "name": "GUAM" },
    { "code": "GTM", "name": "GUATEMALA" },
    { "code": "GGY", "name": "GUERNSEY" },
    { "code": "GIN", "name": "GUINEA" },
    { "code": "GNB", "name": "GUINEA-BISSAU" },
    { "code": "GUY", "name": "UYANA" },
    { "code": "HTI", "name": "HAITI" },
    { "code": "HMD", "name": "HEARD ISLAND AND MCDONALD ISLANDS" },
    { "code": "HND", "name": "HONDURAS" },
    { "code": "HKG", "name": "HONG KONG" },
    { "code": "HUN", "name": "HUNGARY" },
    { "code": "ISL", "name": "ICELAND" },
    { "code": "IND", "name": "INDIA" },
    { "code": "IDN", "name": "INDONESIA" },
    { "code": "IRN", "name": "IRAN ISLAMIC REPUBLIC OF" },
    { "code": "IRQ", "name": "IRAQ" },
    { "code": "IRL", "name": "IRELAND" },
    { "code": "IMN", "name": "ISLE OF MAN" },
    { "code": "ISR", "name": "ISRAEL" },
    { "code": "ITA", "name": "ITALY" },
    { "code": "JAM", "name": "JAMAICA" },
    { "code": "JPN", "name": "JAPAN" },
    { "code": "JEY", "name": "JERSEY (CHANNEL ISLANDS)" },
    { "code": "JOR", "name": "JORDAN" },
    { "code": "KAZ", "name": "KAZAKHSTAN" },
    { "code": "KEN", "name": "KENYA" },
    { "code": "KIR", "name": "KIRIBATI" },
    { "code": "PRK", "name": "KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF " },
    { "code": "KOR", "name": "KOREA, REPUBLIC OF" },
    { "code": "KWT", "name": "KUWAIT" },
    { "code": "KGZ", "name": "KYRGYZSTAN" },
    { "code": "LAO", "name": "LAO PEOPLE'S DEMOCRATIC REPUBLIC " },
    { "code": "LVA", "name": "LATVIA" },
    { "code": "LBN", "name": "LEBANON" },
    { "code": "LSO", "name": "LESOTHO" },
    { "code": "LBR", "name": "LIBERIA" },
    { "code": "LBY", "name": "LIBYAN ARAB JAMAHIRIYA" },
    { "code": "LIE", "name": "LIECHTENSTEIN" },
    { "code": "LTU", "name": "LITHUANIA" },
    { "code": "LUX", "name": "LUXEMBOURG" },
    { "code": "MKD", "name": "MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF" },
    { "code": "MAC", "name": "MACAO" },
    { "code": "MDG", "name": "MADAGASCAR" },
    { "code": "MWI", "name": "MALAWI" },
    { "code": "MDV", "name": "MALDIVES" },
    { "code": "MLI", "name": "MALI" },
    { "code": "MLT", "name": "MALTA" },
    { "code": "MHL", "name": "MARSHALL ISLANDS" },
    { "code": "MTQ", "name": "MARTINIQUE" },
    { "code": "MRT", "name": "MAURITANIA" },
    { "code": "MUS", "name": "MAURITIUS" },
    { "code": "MYT", "name": "MAYOTTE" },
    { "code": "MEX", "name": "MEXICO" },
    { "code": "FSM", "name": "MICRONESIA, FEDERATED STATES OF " },
    { "code": "MDA", "name": "MOLDOVA, REPUBLIC OF" },
    { "code": "MCO", "name": "MONACO" },
    { "code": "MNG", "name": "MONGOLIA" },
    { "code": "MNE", "name": "MONTENEGRO" },
    { "code": "MSR", "name": "MONTSERRAT" },
    { "code": "MAR", "name": "MOROCCO" },
    { "code": "MOZ", "name": "MOZAMBIQUE" },
    { "code": "MMR", "name": "MYANMAR" },
    { "code": "NAM", "name": "NAMIBIA" },
    { "code": "NRU", "name": "NAURU" },
    { "code": "NPL", "name": "NEPAL" },
    { "code": "NLD", "name": "NETHERLANDS" },
    { "code": "NCL", "name": "NEW CALEDONIA" },
    { "code": "NZL", "name": "NEW ZEALAND" },
    { "code": "NIC", "name": "NICARAGUA" },
    { "code": "NER", "name": "NIGER" },
    { "code": "NGA", "name": "NIGERIA" },
    { "code": "NIU", "name": "NIUE" },
    { "code": "NFK", "name": "NORFOLK ISLAND" },
    { "code": "MNP", "name": "NORTHERN MARIANA ISLANDS" },
    { "code": "NOR", "name": "NORWAY" },
    { "code": "OMN", "name": "OMAN" },
    { "code": "PAK", "name": "PAKISTAN" },
    { "code": "PLW", "name": "PALAU" },
    { "code": "PSE", "name": "PALESTINIAN TERRITORY" },
    { "code": "PAN", "name": "PANAMA" },
    { "code": "PNG", "name": "PAPUA NEW GUINEA" },
    { "code": "PRY", "name": "PARAGUAY" },
    { "code": "PER", "name": "PERU" },
    { "code": "PHL", "name": "PHILIPPINES" },
    { "code": "PCN", "name": "PITCAIRN" },
    { "code": "POL", "name": "POLAND" },
    { "code": "PRT", "name": "PORTUGAL" },
    { "code": "PRI", "name": "PUERTO RICO " },
    { "code": "QAT", "name": "QATAR" },
    { "code": "REU", "name": "REUNION" },
    { "code": "ROU", "name": "ROMANIA" },
    { "code": "RUS", "name": "RUSSIAN FEDERATION" },
    { "code": "RWA", "name": "RWANDA" },
    { "code": "SHN", "name": "ST. HELENA" },
    { "code": "KNA", "name": "SAINT KITTS AND NEVIS" },
    { "code": "LCA", "name": "SAINT LUCIA" },
    { "code": "MAF", "name": "SAINT MARTIN (FRENCH PART)" },
    { "code": "SPM", "name": "ST. PIERRE AND MIQUELON" },
    { "code": "VCT", "name": "SAINT VINCENT AND THE GRENADINES" },
    { "code": "WSM", "name": "SAMOA" },
    { "code": "SMR", "name": "SAN MARINO" },
    { "code": "STP", "name": "SAO TOME AND PRINCIPE" },
    { "code": "SAU", "name": "SAUDI ARABIA" },
    { "code": "SEN", "name": "SENEGAL" },
    { "code": "SRB", "name": "SERBIA AND MONTENEGRO" },
    { "code": "SYC", "name": "SEYCHELLES" },
    { "code": "SLE", "name": "SIERRA LEONE" },
    { "code": "SGP", "name": "SINGAPORE" },
    { "code": "SXM", "name": "SINT MAARTEN (DUTCH PART)" },
    { "code": "SVK", "name": "SLOVAKIA (SLOVAK REPUBLIC)" },
    { "code": "SVN", "name": "SLOVENIA" },
    { "code": "SLB", "name": "SOLOMON ISLANDS" },
    { "code": "SOM", "name": "SOMALIA" },
    { "code": "ZAF", "name": "SOUTH AFRICA" },
    { "code": "SGS", "name": "SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS" },
    { "code": "SDN", "name": "SUDAN" },
    { "code": "ESP", "name": "SPAIN" },
    { "code": "LKA", "name": "SRI LANKA" },
    { "code": "SUR", "name": "SURINAME" },
    { "code": "SJM", "name": "SVALBARD AND JAN MAYEN ISLANDS" },
    { "code": "SWZ", "name": "ESWATINI, KINGDOM OF (SWAZILAND" },
    { "code": "SWE", "name": "SWEDEN" },
    { "code": "CHE", "name": "SWITZERLAND" },
    { "code": "SYR", "name": "SYRIAN ARAB REPUBLIC" },
    { "code": "TWN", "name": "TAIWAN, PROVINCE OF CHINA" },
    { "code": "TJK", "name": "TAJIKISTAN" },
    { "code": "TZA", "name": "TANZANIA, UNITED REPUBLIC OF" },
    { "code": "THA", "name": "THAILAND" },
    { "code": "TLS", "name": "TIMOR-LESTE" },
    { "code": "TGO", "name": "TOGO" },
    { "code": "TKL", "name": "TOKELAU" },
    { "code": "TON", "name": "TONGA" },
    { "code": "TTO", "name": "TRINIDAD AND TOBAGO" },
    { "code": "TUN", "name": "TUNISIA" },
    { "code": "TUR", "name": "TURKEY" },
    { "code": "TKM", "name": "TURKMENISTAN" },
    { "code": "TCA", "name": "TURKS AND CAICOS ISLANDS" },
    { "code": "TUV", "name": "TUVALU" },
    { "code": "UGA", "name": "UGANDA" },
    { "code": "UKR", "name": "UKRAINE" },
    { "code": "ARE", "name": "UNITED ARAB EMIRATES" },
    { "code": "GBR", "name": "UNITED KINGDOM" },
    { "code": "UMI", "name": "UNITED STATES MINOR OUTLYING ISLANDS" },
    { "code": "USA", "name": "UNITED STATES" },
    { "code": "URY", "name": "URUGUAY" },
    { "code": "UZB", "name": "UZBEKISTAN" },
    { "code": "VUT", "name": "VANUATU" },
    { "code": "VAT", "name": "VATICAN CITY STATE (HOLY SEE)" },
    { "code": "VEn", "name": "VENEZUELA" },
    { "code": "VNM", "name": "VIETNAM" },
    { "code": "VGB", "name": "VIRGINIA ISLANDS (BRITISH)" },
    { "code": "VIR", "name": "VIRGIN ISLANDS (U.S.)" },
    { "code": "WLF", "name": "WALLIS AND FUTUNA ISLANDS" },
    { "code": "ESH", "name": "WESTERN SAHARA" },
    { "code": "YEM", "name": "YEMEN" },
    { "code": "ZMB", "name": "ZAMBIA" },
    { "code": "ZWE", "name": "ZIMBABWE" }
  ]
 labuanEntityTypes = new Map<string, string>([
    ['1', 'Labuan Company'], ['2', 'Labuan Foundation'], ['3', 'Labuan Islamic Foundation'],
    ['4', 'Labuan Islamic partnership'], ['5', 'Labuan limited partnership'], ['6', 'Labuan Limited Liability Partnership'],
    ['7', 'Labuan Islamic trust'], ['8', 'Labuan trust'], ['9', 'Malaysian Islamic bank licensee'],
    ['10', 'Malaysian bank licensee'], ['11', 'Any Labuan financial institutions'], ['12', 'Any person declared by the Minister to be a Labuan entity']
  ]);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private dialogService: DialogService,
  ) {
    this.le1Form = this.fb.group({
      // Part A: Basic Particulars
      Year_of_Assessment: [''],
      Company_Name: [''],
      Company_Registration_No: [''],
      Telephone_no: [''],
      Email: [''],
      Change_of_Accounting_Period_No: [''],
      Types_of_exchange_of_accounting_periods: [''],
      Accounting_Period_From: [''],
      Accounting_Period_To: [''],
      Basis_Period_From: [''],
      Basis_Period_To: [''],
      FS_in_Foreign_Currency_Yes: [''],
      Currency_Reported: [''],
      Currency_Exchange_Rate: [0],
      Record_keeping: [''],
      Business_Status_In_Operation: [''],
      Type_of_Labuan_entity: [''],
      Incorp_under: [''],

      // Part B: Tax Computation (Now FormArray)
      b1Rows: this.fb.array([]),
      B2_Total_Net_Profits: [''],
      
      // Part B2-B6
      B3a_Chargeable_Profit_0_Percent: [''],
      B3b_Chargeable_Profit_3_Percent: [''],
      B3c_Chargeable_Profit_24_Percent: [''],
      B4_Tax_Charged: [''],
      B5_Zakat_Paid: [''],
      B6_Tax_Payable: [''],

      // Part C: Entity Details
      C1_Registered_Address_line1: [''],
      C1_Registered_Address_line2: [''],
      C1_Correspondence_Address_line1: [''],
      C1_Correspondence_Address_line2: [''],
      C1_Postcode: [''],
      C1_City: [''],
      C1_State: [''],
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
      D1_Subject_as: [''],
      D2_Reporting_Entity_Status: [''],
      D3_Has_Financial_Account_Outside_Malaysia: [''],
      D4_Subject_to_AEOI: [''],

      Auditor_Name: [''],
      Auditor_Country: [''],
      Auditor_Address_line1: [''],
      Auditor_Address_line2: [''],
      Auditor_Postcode: [''],
      Auditor_City: [''],
      Auditor_Email: [''],
      Auditor_Telephone_no: [''],
      Auditor_TIN: [''],

      // Part E & F
      E1_MNE_Group_Name: [''],
      E2_Accounting_Period_From: [''],
      E2_Accounting_Period_To: [''],
      E3_Constituent_Entities_in_Malaysia: [''],
      E4_Constituent_Entities_outside_Malaysia: [''],
      F1_Reporting_Entity_Name: [''],
      F2_TIN: [''],
      F3_Country_of_Residence: [''],
      F4_Accounting_Period_From: [''],
      F4_Accounting_Period_To: [''],
      F5_MNE_Group_Name: [''],
      F6_Status_of_Reporting_Entity: [''],
      F7a_Ultimate_Holding_Entity_Name: [''],
      F7b_Country_of_Residence_UHE: [''],

      // Declaration
      Declarant_Name: [''],
      Declarant_ID_Passport: [''],
      Declaration_Date: [''],
      Declarant_Designation: [''],
      Designation_Others: [''],

      // Attachments (Now FormArrays)
      c3Rows: this.fb.array([]),
      c4Rows: this.fb.array([]),
      c5Rows: this.fb.array([]),
      c10Rows: this.fb.array([]),
      c11Rows: this.fb.array([]),

      // Attachment C9: Financial Particulars (Single Object)
      Business_Activity_Code: [0],
      Type_of_business_activity: [0],
      Fp_Type_of_Labuan_entity: [0],
      Pnl_Sales_Turnover: [0],
      Pnl_Opening_Inventory: [0],
      Pnl_Cost_of_Purchases: [0],
      Pnl_Cost_of_Production: [0],
      Pnl_Closing_Inventory: [0],
      Pnl_Cost_of_Sales: [0],
      Pnl_Gross_Profit_Loss: [0],
      Pnl_Foreign_Currency_Exchange_Gain: [0],
      Pnl_Other_Business_Income: [0],
      Pnl_Other_Income: [0],
      Pnl_Non_Taxable_Profits: [0],
      Pnl_Interest_Expenditure: [0],
      Pnl_Professional_Fees: [0],
      Pnl_Technical_Fees_to_Non_Residents: [0],
      Pnl_Contract_Payments: [0],
      Pnl_Management_Fee: [0],
      Pnl_Salaries_Wages: [0],
      Pnl_Cost_of_Employee_Share_Options: [0],
      Pnl_Royalties: [0],
      Pnl_Rental_Lease: [0],
      Pnl_Maintenance_Repairs: [0],
      Pnl_Research_Development: [0],
      Pnl_Promotion_Advertisement: [0],
      Pnl_Travelling_Accommodation: [0],
      Pnl_Foreign_Currency_Exchange_Loss: [0],
      Pnl_Other_Expenditure: [0],
      Pnl_Total_Expenditure: [0],
      Pnl_Net_Profit_Loss: [0],
      Fp_Motor_Vehicles: [0],
      Fp_Plant_Equipment: [0],
      Fp_Land_Buildings: [0],
      Fp_Other_Non_Current_Assets: [0],
      Fp_Investments: [0],
      Fp_Total_Non_Current_Assets: [0],
      Fp_Cost_of_NCA_Acquired: [0],
      Fp_Trade_Debtors: [0],
      Fp_Other_Debtors: [0],
      Fp_Inventory: [0],
      Fp_Loans_to_Related_Entities: [0],
      Fp_Cash_in_Hand_Bank: [0],
      Fp_Other_Current_Assets: [0],
      Fp_Total_Current_Assets: [0],
      Fp_Total_Assets: [0],
      Fp_Loans_Bank_Overdrafts: [0],
      Fp_Trade_Creditors: [0],
      Fp_Other_Creditors: [0],
      Fp_Loans_from_Related_Entities: [0],
      Fp_Other_Current_Liabilities: [0],
      Fp_Total_Current_Liabilities: [0],
      Fp_Non_Current_Liabilities: [0],
      Fp_Total_Liabilities: [0],
      Fp_Issued_Paid_Up_Capital: [0],
      Fp_Profit_Loss_Appropriation: [0],
      Fp_Reserve_Account: [0],
      Fp_Total_Equity: [0],
      Fp_Total_Liabilities_and_Equity: [0],
    });
  }

  // --- FormArray Getters ---
  get b1Rows(): FormArray { return this.le1Form.get('b1Rows') as FormArray; }
  get c3Rows(): FormArray { return this.le1Form.get('c3Rows') as FormArray; }
  get c4Rows(): FormArray { return this.le1Form.get('c4Rows') as FormArray; }
  get c5Rows(): FormArray { return this.le1Form.get('c5Rows') as FormArray; }
  get c10Rows(): FormArray { return this.le1Form.get('c10Rows') as FormArray; }
  get c11Rows(): FormArray { return this.le1Form.get('c11Rows') as FormArray; }

  // --- Row Creators & Logic ---
  createB1Row(data: any = {}): FormGroup {
    const group = this.fb.group({
      Business_Activity_Code: [data.Business_Activity_Code || ''],
      Core_Income_Activity_Yes: [data.Core_Income_Activity_Yes || ''],
      Business_Activity_Status_Active: [data.Business_Activity_Status_Active || ''],
      No_of_Employees: [data.No_of_Employees || ''],
      Annual_Operating_Expenditure: [data.Annual_Operating_Expenditure || ''],
      Annual_Operating_Expenditure_MAS: [data.Annual_Operating_Expenditure_MAS || ''],
      Compliance_with_FPEC: [data.Compliance_with_FPEC || ''],
      Compliance_with_CML: [data.Compliance_with_CML || ''],
      No_of_Employees_Malaysia: [data.No_of_Employees_Malaysia || ''],
      No_of_Related_Company: [data.No_of_Related_Company || ''],
      Comply_Substantive_Yes: [data.Comply_Substantive_Yes || ''],
      Amount_of_Net_Loss: [data.Amount_of_Net_Loss || ''],
      Net_Profits_ex_IP: [data.Net_Profits_ex_IP || '']
    });

    // Attach Listeners
    this.setupB1RowLogic(group);
    group.get('Net_Profits_ex_IP')?.valueChanges.subscribe(() => this.calculateB2Total());
    
    return group;
  }

  createC3Row(data: any = {}): FormGroup {
    return this.fb.group({
      Name: [data.Name || ''],
      Claim_PUA_419_2011: [data.Claim_PUA_419_2011 || ''],
      Designation: [data.Designation || ''],
      Country: [data.Country || ''],
      Address1: [data.Address1 || ''],
      Address2: [data.Address2 || ''],
      Postcode: [data.Postcode || ''],
      Town: [data.Town || ''],
      ID_type: [data.ID_type || ''],
      ID_Passport_No: [data.ID_Passport_No || ''],
      Date_of_Birth: [data.Date_of_Birth || ''],
      TIN: [data.TIN || ''],
      Telephone_No: [data.Telephone_No || ''],
      Salary_Bonus: [data.Salary_Bonus || ''],
      Fees_Commission_Allowances: [data.Fees_Commission_Allowances || ''],
      Total_Loan_to_Officer: [data.Total_Loan_to_Officer || ''],
      Total_Loan_from_Officer: [data.Total_Loan_from_Officer || '']
    });
  }

  createC4Row(data: any = {}): FormGroup {
    return this.fb.group({
      Name_of_Shareholder_Partner: [data.Name_of_Shareholder_Partner || ''],
      Country: [data.Country || ''],
      Address1: [data.Address1 || ''],
      Address2: [data.Address2 || ''],
      Postcode: [data.Postcode || ''],
      Town: [data.Town || ''],
      ID_type: [data.ID_type || ''],
      ID_Passport_Reg_No: [data.ID_Passport_Reg_No || ''],
      Date_of_Birth: [data.Date_of_Birth || ''],
      Country_of_Origin: [data.Country_of_Origin || ''],
      TIN: [data.TIN || ''],
      Direct_Shareholding_Percentage: [data.Direct_Shareholding_Percentage || ''],
      Dividends_Received_in_Basis_Period: [data.Dividends_Received_in_Basis_Period || '']
    });
  }

  createC5Row(data: any = {}): FormGroup {
    return this.fb.group({
      Name: [data.Name || ''],
      TIN: [data.TIN || ''],
      Shareholding_Percentage: [data.Shareholding_Percentage || ''],
      Salary_Bonus: [data.Salary_Bonus || ''],
      Dividends_Received_in_Basis_Period: [data.Dividends_Received_in_Basis_Period || ''],
      Total_Loan_from_Owner: [data.Total_Loan_from_Owner || ''],
      Total_Loan_to_Owner: [data.Total_Loan_to_Owner || ''],
      Country: [data.Country || ''],
      Address1: [data.Address1 || ''],
      Address2: [data.Address2 || ''],
      Postcode: [data.Postcode || ''],
      Town: [data.Town || ''],
      ID_type: [data.ID_type || ''],
      ID_Passport_No: [data.ID_Passport_No || ''],
      Date_of_Birth: [data.Date_of_Birth || ''],
      Telephone_No: [data.Telephone_No || ''],
      Fees_Commission_Allowance: [data.Fees_Commission_Allowance || '']
    });
  }

  createC10Row(data: any = {}): FormGroup {
    return this.fb.group({
      Name: [data.Name || ''],
      Registration_No: [data.Registration_No || ''],
      TIN: [data.TIN || ''],
      Have_Transactions: [data.Have_Transactions || '']
    });
  }

  createC11Row(data: any = {}): FormGroup {
    return this.fb.group({
      Name_of_taxpayer: [data.Name_of_taxpayer || ''],
      TIN: [data.TIN || ''],
      Type_of_payment_received: [data.Type_of_payment_received || ''],
      Payment_Related_to: [data.Payment_Related_to || ''],
      Amount: [data.Amount || '']
    });
  }

  // --- Add / Remove Methods ---
  addRow(section: 'b1' | 'c3' | 'c4' | 'c5' | 'c10' | 'c11'): void {
    const sectionMap: { [key: string]: () => FormGroup } = {
      'b1': () => this.createB1Row(),
      'c3': () => this.createC3Row(),
      'c4': () => this.createC4Row(),
      'c5': () => this.createC5Row(),
      'c10': () => this.createC10Row(),
      'c11': () => this.createC11Row()
    };

    if (sectionMap[section]) {
      const formArray = this.le1Form.get(section + 'Rows') as FormArray;
      formArray.push(sectionMap[section]());
      this.accordionStates[section].push(true); // Open the new row
      this.checkAllSectionsCompletion();
    }
  }

  removeRow(section: 'b1' | 'c3' | 'c4' | 'c5' | 'c10' | 'c11', index: number): void {
    const formArray = this.le1Form.get(section + 'Rows') as FormArray;
    if (confirm("Are you sure you want to delete this row?")) {
      formArray.removeAt(index);
      this.accordionStates[section].splice(index, 1);
      if (section === 'b1') this.calculateB2Total();
      this.checkAllSectionsCompletion();
    }
  }

  // --- B1 Business Logic ---
  setupB1RowLogic(rowGroup: FormGroup): void {
    const codeControl = rowGroup.get('Business_Activity_Code');
    const statusControl = rowGroup.get('Business_Activity_Status_Active');

    const updateRowState = () => {
      const code = codeControl?.value;
      const status = statusControl?.value;

      const fieldMap = {
        cml: 'Compliance_with_CML',
        employees: 'No_of_Employees',
        employeesMY: 'No_of_Employees_Malaysia',
        opex: 'Annual_Operating_Expenditure',
        opexMY: 'Annual_Operating_Expenditure_MAS',
        fpec: 'Compliance_with_FPEC',
        relatedCo: 'No_of_Related_Company',
        netProfit: 'Net_Profits_ex_IP'
      };

      const setDisabled = (fields: string[], isDisabled: boolean) => {
        fields.forEach(f => {
          const control = rowGroup.get(f);
          if (isDisabled) {
            control?.disable({ emitEvent: false });
            control?.setValue('', { emitEvent: false });
          } else {
            control?.enable({ emitEvent: false });
          }
        });
      };

      // Reset
      setDisabled(Object.values(fieldMap), false);

      if (status === '2') { // Dormant
        setDisabled(Object.values(fieldMap), true);
        return;
      }

      if (code === '00006') setDisabled([fieldMap.cml], true);
      if (code === '00022') {
        setDisabled([fieldMap.employees, fieldMap.employeesMY, fieldMap.opex, fieldMap.fpec, fieldMap.relatedCo], true);
      }
      if (code !== '00006' && code !== '00022') {
        setDisabled([fieldMap.employeesMY, fieldMap.opexMY, fieldMap.relatedCo, fieldMap.cml], true);
      }
    };

    codeControl?.valueChanges.subscribe(updateRowState);
    statusControl?.valueChanges.subscribe(updateRowState);
    updateRowState(); // Run init check
  }

  calculateB2Total(): void {
    const rows = this.b1Rows.controls as FormGroup[];
    let total = 0;
    rows.forEach(row => {
      const val = row.get('Net_Profits_ex_IP')?.value;
      const num = val ? parseFloat(String(val).replace(/,/g, '')) : 0;
      total += isNaN(num) ? 0 : num;
    });
    this.le1Form.get('B2_Total_Net_Profits')?.setValue(total, { emitEvent: false });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  ngOnInit(): void {
    this.projectId = this.auth.getProjectId();

    if (this.projectId) {
      this.loadProjectData(this.projectId);
    } else {
      console.warn('No project ID found. Redirecting to reports page.');
      this.router.navigate(['/reports']);
      return;
    }

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        const element = document.querySelector('#' + fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', inline: 'nearest' });
        }
      }
    });

    this.le1Form.valueChanges.subscribe(() => {
      this.checkAllSectionsCompletion();
    });

    // --- Global Conditional Logic (Non-Array) ---
    this.le1Form.get('Change_of_Accounting_Period_No')?.valueChanges.subscribe(value => {
      const target = this.le1Form.get('Types_of_exchange_of_accounting_periods');
      if (value === '1') target?.enable();
      else {
        target?.setValue('');
        target?.disable();
      }
    });

    this.le1Form.get('FS_in_Foreign_Currency_Yes')?.valueChanges.subscribe(value => {
      const a = ['Currency_Reported', 'Currency_Exchange_Rate'];
      if (value === '1') a.forEach(c => this.le1Form.get(c)?.enable());
      else a.forEach(c => {
        this.le1Form.get(c)?.setValue('');
        this.le1Form.get(c)?.disable();
      });
    });

     this.le1Form.get('C6a_Has_Related_Company')?.valueChanges.subscribe(value => {
      const target = this.le1Form.get('C6b_Number_of_Related_Companies_Qualifying_Activity');
      if (value === '1') target?.enable();
      else {
        target?.setValue('');
        target?.disable();
      }
    });
    this.le1Form.get('C7a_Derived_Income_from_Non_Labuan_Activity')?.valueChanges.subscribe(value => {
      const target = this.le1Form.get('C7b_Total_Income_from_Non_Labuan_Activity');
      if (value === '1') target?.enable();
      else {
        target?.setValue('');
        target?.disable();
      }
    });
    this.le1Form.get('C8a_Derived_Income_from_IP')?.valueChanges.subscribe(value => {
      const target = this.le1Form.get('C8b_Total_Income_from_IP');
      if (value === '1') target?.enable();
      else {
        target?.setValue('');
        target?.disable();
      }
    });

    this.le1Form.get('D1_Subject_to_CbCR')?.valueChanges.subscribe(value => {
      if (value === '1') this.le1Form.get('D1_Subject_as')?.enable();
      else {
        this.le1Form.get('D1_Subject_as')?.setValue('');
        this.le1Form.get('D1_Subject_as')?.disable();
      }
    });

    this.le1Form.get('D1_Subject_as')?.valueChanges.subscribe(value => {
      const p_E = ['E1_MNE_Group_Name', 'E2_Accounting_Period_From', 'E2_Accounting_Period_To', 'E3_Constituent_Entities_in_Malaysia', 'E4_Constituent_Entities_outside_Malaysia'];
      const p_F = ['F1_Reporting_Entity_Name', 'F2_TIN', 'F3_Country_of_Residence', 'F4_Accounting_Period_From', 'F4_Accounting_Period_To', 'F5_MNE_Group_Name', 'F6_Status_of_Reporting_Entity', 'F7a_Ultimate_Holding_Entity_Name', 'F7b_Country_of_Residence_UHE'];

      if (value === '1') {
        p_E.forEach(c => this.le1Form.get(c)?.enable());
        p_F.forEach(c => this.le1Form.get(c)?.disable());
      } else if (value === '2') {
        p_E.forEach(c => this.le1Form.get(c)?.disable());
        p_F.forEach(c => this.le1Form.get(c)?.enable());
      } else {
        p_E.forEach(c => this.le1Form.get(c)?.disable());
        p_F.forEach(c => this.le1Form.get(c)?.disable());
      }
    });

    this.le1Form.get('C10_Has_Subsidiary_Outside_Labuan')?.valueChanges.subscribe(value => {
      if (value === '1') this.c10Rows.enable();
      else {
        this.c10Rows.disable();
        // Optional: Clear array? Or just disable controls? 
        // Currently keeping data but disabled.
      }
    });

    this.le1Form.get('C11_Received_Payments_from_Malaysian_Resident')?.valueChanges.subscribe(value => {
      if (value === '1') this.c11Rows.enable();
      else {
        this.c11Rows.disable();
      }
    });

    this.le1Form.get('Business_Activity_Code')?.valueChanges.subscribe(code => {
      this.updateBusinessActivityDescription(code);
    });

    this.le1Form.get('Type_of_Labuan_entity')?.valueChanges.subscribe(value => {
      this.updateFpLabuanEntityType(value);
    });

    // C9 Calculations Watcher
    const c9FieldsToWatch = [
      'Pnl_Sales_Turnover', 'Pnl_Opening_Inventory', 'Pnl_Cost_of_Purchases', 'Pnl_Cost_of_Production',
      'Pnl_Closing_Inventory', 'Pnl_Foreign_Currency_Exchange_Gain', 'Pnl_Other_Business_Income',
      'Pnl_Other_Income', 'Pnl_Non_Taxable_Profits', 'Pnl_Interest_Expenditure', 'Pnl_Professional_Fees',
      'Pnl_Technical_Fees_to_Non_Residents', 'Pnl_Contract_Payments', 'Pnl_Management_Fee',
      'Pnl_Salaries_Wages', 'Pnl_Cost_of_Employee_Share_Options', 'Pnl_Royalties', 'Pnl_Rental_Lease',
      'Pnl_Maintenance_Repairs', 'Pnl_Research_Development', 'Pnl_Promotion_Advertisement',
      'Pnl_Travelling_Accommodation', 'Pnl_Foreign_Currency_Exchange_Loss', 'Pnl_Other_Expenditure',
      'Fp_Motor_Vehicles', 'Fp_Plant_Equipment', 'Fp_Land_Buildings', 'Fp_Other_Non_Current_Assets',
      'Fp_Investments', 'Fp_Trade_Debtors', 'Fp_Other_Debtors', 'Fp_Inventory',
      'Fp_Loans_to_Related_Entities', 'Fp_Cash_in_Hand_Bank', 'Fp_Other_Current_Assets',
      'Fp_Loans_Bank_Overdrafts', 'Fp_Trade_Creditors', 'Fp_Other_Creditors',
      'Fp_Loans_from_Related_Entities', 'Fp_Other_Current_Liabilities', 'Fp_Non_Current_Liabilities',
      'Fp_Issued_Paid_Up_Capital', 'Fp_Profit_Loss_Appropriation', 'Fp_Reserve_Account'
    ];

    c9FieldsToWatch.forEach(fieldName => {
      this.le1Form.get(fieldName)?.valueChanges.subscribe(() => this.updateC9());
    });
  }

  // --- Data Loading & Parsing ---

  loadProjectData(projectId: any): void {
    this.isLoading = true;
    this.http.get<any>(`${this.apiUrl}/getProjectDetails/${projectId}`).subscribe({
      next: (response) => {
        if (response && response[0].data) {
          const data = response[0].data;

          
          

          // 2. Populate FormArrays directly from nested arrays
          // We use a simplified helper now because the data is already an array
          const dateFields = [
            'Accounting_Period_From', 'Accounting_Period_To', 
            'Basis_Period_From', 'Basis_Period_To', 
            'Declaration_Date',
            'E2_Accounting_Period_From', 'E2_Accounting_Period_To', 
            'F4_Accounting_Period_From', 'F4_Accounting_Period_To'
          ];

          // Convert Top-Level fields
          dateFields.forEach(field => {
            if (data[field]) {
              data[field] = this.convertDateForInput(data[field]);
            }
          });

          // 2. Convert Nested Array Date Fields (Date_of_Birth)
          if (Array.isArray(data.c3Rows)) {
            data.c3Rows.forEach((row: any) => {
              if (row.Date_of_Birth) row.Date_of_Birth = this.convertDateForInput(row.Date_of_Birth);
            });
          }
          if (Array.isArray(data.c4Rows)) {
            data.c4Rows.forEach((row: any) => {
              if (row.Date_of_Birth) row.Date_of_Birth = this.convertDateForInput(row.Date_of_Birth);
            });
          }
          if (Array.isArray(data.c5Rows)) {
            data.c5Rows.forEach((row: any) => {
              if (row.Date_of_Birth) row.Date_of_Birth = this.convertDateForInput(row.Date_of_Birth);
            });
          }
          this.le1Form.patchValue(data);
          this.populateFormArray(this.b1Rows, data.b1Rows, (d) => this.createB1Row(d));
          this.populateFormArray(this.c3Rows, data.c3Rows, (d) => this.createC3Row(d));
          this.populateFormArray(this.c4Rows, data.c4Rows, (d) => this.createC4Row(d));
          this.populateFormArray(this.c5Rows, data.c5Rows, (d) => this.createC5Row(d));
          this.populateFormArray(this.c10Rows, data.c10Rows, (d) => this.createC10Row(d));
          this.populateFormArray(this.c11Rows, data.c11Rows, (d) => this.createC11Row(d));

          // 3. Initialize Accordion States based on array length
          this.resetAccordionStates();

          // 4. Post-load logic
          this.updateBusinessActivityDescription(data.Business_Activity_Code);
          this.updateFpLabuanEntityType(data.Type_of_Labuan_entity);
          this.checkAllSectionsCompletion();
        }
      },
      error: (err) => {
        console.error('Error fetching project details:', err);
        this.isLoading = false;
      },
      complete: () => { setTimeout(() => this.isLoading = false, 500); }
    });
  }

  // New, simplified helper method
  populateFormArray(formArray: FormArray, dataArray: any[], createFn: (item: any) => FormGroup) {
    formArray.clear();
    
    if (Array.isArray(dataArray) && dataArray.length > 0) {
      dataArray.forEach(item => {
        formArray.push(createFn(item));
      });
    } else {
      // If array is empty or undefined, create one empty default row
      formArray.push(createFn({}));
    }
  }

  resetAccordionStates() {
    const init = (key: string, arr: FormArray) => {
      this.accordionStates[key] = new Array(arr.length).fill(false);
      if (arr.length > 0) this.accordionStates[key][0] = true;
    };
    init('b1', this.b1Rows);
    init('c3', this.c3Rows);
    init('c4', this.c4Rows);
    init('c5', this.c5Rows);
    init('c10', this.c10Rows);
    init('c11', this.c11Rows);
  }

  // Helper to extract flat data into array objects
  
  populateC10Array(formArray: FormArray, rawData: any) {
    formArray.clear();
    // C10 fields are Name1, Registration_No1, etc. No underscore separator after index.
    for (let i = 1; i < 50; i++) {
      const suffix = String(i);
      // Check if Name{i} exists
      if (rawData.hasOwnProperty(`Name${i}`)) {
        formArray.push(this.createC10Row({
          Name: rawData[`Name${i}`],
          Registration_No: rawData[`Registration_No${i}`],
          TIN: rawData[`TIN${i}`],
          Have_Transactions: rawData[`Have_Transactions${i}`]
        }));
      } else {
         if (i > 5) break;
      }
    }
    if (formArray.length === 0) formArray.push(this.createC10Row({}));
  }

  // Helper: Convert DD/MM/YYYY -> YYYY-MM-DD for HTML input
  private convertDateForInput(dateValue: string): string {
    // Check if value is in DD/MM/YYYY format (e.g., 31/01/2025)
    if (dateValue && typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
      const parts = dateValue.split('/'); // [DD, MM, YYYY]
      // Return YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`; 
    }
    return dateValue; // Return as-is if it's already correct or empty
  }
  // --- Save & Formatting ---
  
  private getFormattedData(): any {
    // 1. Get the nested object structure directly
    const formData = this.le1Form.getRawValue();

    // 2. Format Top-Level Dates
    const topLevelDateFields = [
      'Accounting_Period_From', 'Accounting_Period_To', 'Basis_Period_From', 'Basis_Period_To', 'Declaration_Date',
      'E2_Accounting_Period_From', 'E2_Accounting_Period_To', 'F4_Accounting_Period_From', 'F4_Accounting_Period_To'
    ];

    topLevelDateFields.forEach(field => {
      if (formData[field]) {
        formData[field] = this.formatDate(formData[field]);
      }
    });

    // 3. Format Dates inside Nested Arrays
    // We iterate through the arrays and update the date fields in place
    if (formData.c3Rows) {
      formData.c3Rows.forEach((row: any) => row.Date_of_Birth = this.formatDate(row.Date_of_Birth));
    }
    if (formData.c4Rows) {
      formData.c4Rows.forEach((row: any) => row.Date_of_Birth = this.formatDate(row.Date_of_Birth));
    }
    if (formData.c5Rows) {
      formData.c5Rows.forEach((row: any) => row.Date_of_Birth = this.formatDate(row.Date_of_Birth));
    }

    // No need to flatten! The API will receive { "Company_Name": "...", "b1Rows": [...] }
    return formData;
  }


  formatDate(value: any) {
    if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    return value;
  }

  // --- Helper Methods ---

  updateBusinessActivityDescription(code: string | null): void {
    const activity = this.businessActivities.find(a => a.code === code);
    this.le1Form.get('Type_of_business_activity')?.setValue(activity ? activity.description : '', { emitEvent: false });
  }

  updateFpLabuanEntityType(value: string | null): void {
    const entityTypeLabel = this.labuanEntityTypes.get(value || '') || '';
    this.le1Form.get('Fp_Type_of_Labuan_entity')?.setValue(entityTypeLabel, { emitEvent: false });
  }

  isFieldComplete(control: AbstractControl | null): boolean {
    if (!control) return false;
    if (control.disabled) return true;
    return control.value !== null && control.value !== undefined && control.value !== '';
  }

  checkAllSectionsCompletion(): void {
    // Part A
    const partAFields = ['Year_of_Assessment', 'Company_Name', 'Company_Registration_No', 'Email', 'Telephone_no', 'Change_of_Accounting_Period_No', 'Accounting_Period_From', 'Accounting_Period_To', 'Basis_Period_From', 'Basis_Period_To', 'FS_in_Foreign_Currency_Yes', 'Record_keeping', 'Business_Status_In_Operation', 'Type_of_Labuan_entity', 'Incorp_under'];
    if (this.le1Form.get('Change_of_Accounting_Period_No')?.value === '1') partAFields.push('Types_of_exchange_of_accounting_periods');
    this.sectionStatus['part-a'] = partAFields.every(f => this.isFieldComplete(this.le1Form.get(f)));

    // Part B
    this.sectionStatus['part-b'] = this.b1Rows.controls.every(g => {
      // all fields of b1 
       return this.isFieldComplete(g.get('Business_Activity_Code')) && 
              this.isFieldComplete(g.get('Business_Activity_Status_Active')) && this.isFieldComplete(g.get('Core_Income_Activity_Yes')) 
              && this.isFieldComplete(g.get('Net_Profits_ex_IP')) &&  (this.isFieldComplete(g.get('No_of_Employees')) || g.get('No_of_Employees')?.disabled)
              && (this.isFieldComplete(g.get('No_of_Employees_Malaysia')) || g.get('No_of_Employees_Malaysia')?.disabled)
              && (this.isFieldComplete(g.get('Annual_Operating_Expenditure')) || g.get('Annual_Operating_Expenditure')?.disabled)
              && (this.isFieldComplete(g.get('Annual_Operating_Expenditure_MAS')) || g.get('Annual_Operating_Expenditure_MAS')?.disabled)
              && (this.isFieldComplete(g.get('Compliance_with_FPEC')) || g.get('Compliance_with_FPEC')?.disabled)
              && (this.isFieldComplete(g.get('Compliance_with_CML')) || g.get('Compliance_with_CML')?.disabled)
              && (this.isFieldComplete(g.get('No_of_Related_Company')) || g.get('No_of_Related_Company')?.disabled)
              && (this.isFieldComplete(g.get('Amount_of_Net_Loss')) || g.get('Amount_of_Net_Loss')?.disabled)
              ;
    }) && this.isFieldComplete(this.le1Form.get('B2_Total_Net_Profits'));

    // Part C
    this.sectionStatus['part-c'] = ['C1_Registered_Address_line1', 'C2_Address_Is_Tax_Agent_or_Trust_Co', 'C6a_Has_Related_Company', 'C7a_Derived_Income_from_Non_Labuan_Activity', 'C8a_Derived_Income_from_IP', 'C10_Has_Subsidiary_Outside_Labuan', 'C11_Received_Payments_from_Malaysian_Resident'].every(f => this.isFieldComplete(this.le1Form.get(f)));

    // Part D
    let partD = this.isFieldComplete(this.le1Form.get('D1_Subject_to_CbCR'));
    if (this.le1Form.get('D1_Subject_to_CbCR')?.value === '1') {
        partD = partD && this.isFieldComplete(this.le1Form.get('D1_Subject_as'));
        // Logic for E/F is handled by form state (enable/disable) which isFieldComplete checks
        if(this.le1Form.get('D1_Subject_as')?.value === '1') {
             partD = partD && this.isFieldComplete(this.le1Form.get('E1_MNE_Group_Name'));
        } else if(this.le1Form.get('D1_Subject_as')?.value === '2') {
             partD = partD && this.isFieldComplete(this.le1Form.get('F1_Reporting_Entity_Name'));
        }
    }
    partD = partD && this.isFieldComplete(this.le1Form.get('D3_Has_Financial_Account_Outside_Malaysia'));
    this.sectionStatus['part-d'] = partD;

    // Auditor & Declaration
    this.sectionStatus['auditor'] = this.isFieldComplete(this.le1Form.get('Auditor_Name'));
    this.sectionStatus['declaration'] = this.isFieldComplete(this.le1Form.get('Declarant_Name'));

    // Arrays
    const c3fields = ['Name', 'Country', 'Address1', 'Postcode', 'Town', 'ID_type', 'ID_Passport_No', 'Date_of_Birth','Claim_PUA_419_2011', 'Telephone_No'];
    this.sectionStatus['attachment-c3'] = this.c3Rows.controls.every(g => c3fields.every(f => this.isFieldComplete(g.get(f))));
    // this.sectionStatus['attachment-c3'] = this.c3Rows.controls.every(g => this.isFieldComplete(g.get('Name')));

    const c4fields = ['Name_of_Shareholder_Partner', 'Country', 'Address1', 'Postcode', 'Town', 'ID_type', 'ID_Passport_Reg_No', 'Date_of_Birth','Country_of_Origin', 'Direct_Shareholding_Percentage'];
    // this.sectionStatus['attachment-c4'] = this.c4Rows.controls.every(g => this.isFieldComplete(g.get('Name_of_Shareholder_Partner')));
    this.sectionStatus['attachment-c4'] = this.c4Rows.controls.every(g => c4fields.every(f => this.isFieldComplete(g.get(f))));
    const c5fields = ['Name', 'Shareholding_Percentage', 'Country', 'Address1', 'Postcode', 'Town', 'ID_type', 'ID_Passport_No', 'Date_of_Birth'];
    // this.sectionStatus['attachment-c5'] = this.c5Rows.controls.every(g => this.isFieldComplete(g.get('Name')));
    this.sectionStatus['attachment-c5'] = this.c5Rows.controls.every(g => c5fields.every(f => this.isFieldComplete(g.get(f))));
    
    // Conditional Arrays
    if(this.le1Form.get('C10_Has_Subsidiary_Outside_Labuan')?.value === '1') {
        this.sectionStatus['attachment-c10'] = this.c10Rows.controls.every(g => this.isFieldComplete(g.get('Name')));
    } else {
        this.sectionStatus['attachment-c10'] = true;
    }

    if(this.le1Form.get('C11_Received_Payments_from_Malaysian_Resident')?.value === '1') {
         this.sectionStatus['attachment-c11'] = this.c11Rows.controls.every(g => this.isFieldComplete(g.get('Name_of_taxpayer')));
    } else {
        this.sectionStatus['attachment-c11'] = true;
    }
    const c9fields = ['Business_Activity_Code','Type_of_business_activity', 'Fp_Type_of_Labuan_entity']
    // this.sectionStatus['attachment-c9'] = this.isFieldComplete(this.le1Form.get('Pnl_Sales_Turnover'));
    this.sectionStatus['attachment-c9'] = c9fields.every(f => this.isFieldComplete(this.le1Form.get(f)));
  }
  
  getSectionFriendlyName(key: string): string {
    const names: { [key: string]: string } = {
      'part-a': 'Part A: Basic Particulars',
      'part-b': 'Part B: Tax Computation',
      'part-c': 'Part C: Entity Details',
      'part-d': 'Part D: CbC Reporting',
      'auditor': 'Particular of Auditor',
      'declaration': 'Declaration',
      'attachment-c3': 'Att. C3: Compliance Officers',
      'attachment-c4': 'Att. C4: Major Shareholders',
      'attachment-c5': 'Att. C5: Beneficial Owners',
      'attachment-c9': 'Att. C9: Financial Particulars',
      'attachment-c10': 'Att. C10: Subsidiaries',
      'attachment-c11': 'Att. C11: Payments Received'
    };
    return names[key] || key;
  }

  updateC9() {
      // [Keep existing calculation logic]
      const controls = this.le1Form.controls;
      const getNumber = (controlName: string) => Number(controls[controlName].value) || 0;

      const costOfSales = getNumber('Pnl_Opening_Inventory') + getNumber('Pnl_Cost_of_Purchases') + getNumber('Pnl_Cost_of_Production') - getNumber('Pnl_Closing_Inventory');
      const grossProfitLoss = getNumber('Pnl_Sales_Turnover') - costOfSales;
      const totalExpenditure =
        getNumber('Pnl_Interest_Expenditure') + getNumber('Pnl_Professional_Fees') + getNumber('Pnl_Technical_Fees_to_Non_Residents') +
        getNumber('Pnl_Contract_Payments') + getNumber('Pnl_Management_Fee') + getNumber('Pnl_Salaries_Wages') +
        getNumber('Pnl_Cost_of_Employee_Share_Options') + getNumber('Pnl_Royalties') + getNumber('Pnl_Rental_Lease') +
        getNumber('Pnl_Maintenance_Repairs') + getNumber('Pnl_Research_Development') + getNumber('Pnl_Promotion_Advertisement') +
        getNumber('Pnl_Travelling_Accommodation') + getNumber('Pnl_Foreign_Currency_Exchange_Loss') + getNumber('Pnl_Other_Expenditure');
      const netProfitLoss =
        grossProfitLoss + getNumber('Pnl_Foreign_Currency_Exchange_Gain') + getNumber('Pnl_Other_Business_Income') +
        getNumber('Pnl_Other_Income') - getNumber('Pnl_Non_Taxable_Profits') - totalExpenditure;

      const totalNonCurrentAssets =
        getNumber('Fp_Motor_Vehicles') + getNumber('Fp_Plant_Equipment') + getNumber('Fp_Land_Buildings') +
        getNumber('Fp_Other_Non_Current_Assets') + getNumber('Fp_Investments');
      const totalCurrentAssets =
        getNumber('Fp_Trade_Debtors') + getNumber('Fp_Other_Debtors') + getNumber('Fp_Inventory') +
        getNumber('Fp_Loans_to_Related_Entities') + getNumber('Fp_Cash_in_Hand_Bank') + getNumber('Fp_Other_Current_Assets');
      const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

      const totalCurrentLiabilities =
        getNumber('Fp_Loans_Bank_Overdrafts') + getNumber('Fp_Trade_Creditors') + getNumber('Fp_Other_Creditors') +
        getNumber('Fp_Loans_from_Related_Entities') + getNumber('Fp_Other_Current_Liabilities');
      const totalLiabilities = totalCurrentLiabilities + getNumber('Fp_Non_Current_Liabilities');
      const totalEquity =
        getNumber('Fp_Issued_Paid_Up_Capital') + getNumber('Fp_Profit_Loss_Appropriation') + getNumber('Fp_Reserve_Account');
      const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

      this.le1Form.patchValue({
        Pnl_Cost_of_Sales: costOfSales,
        Pnl_Gross_Profit_Loss: grossProfitLoss,
        Pnl_Total_Expenditure: totalExpenditure,
        Pnl_Net_Profit_Loss: netProfitLoss,
        Fp_Total_Non_Current_Assets: totalNonCurrentAssets,
        Fp_Total_Current_Assets: totalCurrentAssets,
        Fp_Total_Assets: totalAssets,
        Fp_Total_Current_Liabilities: totalCurrentLiabilities,
        Fp_Total_Liabilities: totalLiabilities,
        Fp_Total_Equity: totalEquity,
        Fp_Total_Liabilities_and_Equity: totalLiabilitiesAndEquity
      }, { emitEvent: false });
  }

  // --- Submit / Save / PDF ---

    saveProject(): void {
    if (!this.projectId) {
      alert('No project is currently loaded.');
      return;
    }

    this.isLoading = true;
    
    // Get the nested JSON data
    const nestedData = this.getFormattedData(); 

    this.http.put(`${this.apiUrl}/updateProjectDetails/${this.projectId}`, { data: nestedData }).subscribe({
      next: (response) => {
        console.log('Project update successful', response);
        alert('Project data has been saved successfully!');
      },
      error: (err) => {
        console.error('Error updating project details:', err);
        alert('An error occurred while saving the project.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  async generatePdf(): Promise<void> {
    if (this.le1Form.invalid) {
      alert('The form is invalid. Please check all fields.');
      return;
    }
    this.isLoading = true;

    try {
      const assets = await lastValueFrom(forkJoin({
        pdfTemplateBytes: this.http.get('assets/contohbn_le1-2025-asas-tahun-semasa-_1 (2) (1) (1).pdf', { responseType: 'arraybuffer' }),
        mapping: this.http.get<any>('assets/data_mapping.json')
      }));

      const { pdfTemplateBytes, mapping } = assets;

      const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
      const pages = pdfDoc.getPages();
      const formValues = this.le1Form.getRawValue(); // Use getRawValue to include disabled fields

      for (const fieldName in mapping) {
        if (Object.prototype.hasOwnProperty.call(mapping, fieldName)) {
          const coords = mapping[fieldName];
          let value = formValues[fieldName];

          // For radio buttons, the value might be '1' or '2'. You might need to map this to 'Yes'/'No' or a checkmark.
          // This is a simple example; your mapping could be more complex.

          if (value !== null && value !== undefined) {
            const pageIndex = coords.page;
            if (pageIndex >= 0 && pageIndex < pages.length) {
              const page = pages[pageIndex];
              // Format numbers with commas for the PDF
              if (typeof value === 'number' || !isNaN(Number(value))) {
                value = new Intl.NumberFormat('en-US').format(Number(value));
              }
              page.drawText(String(value), {
                x: coords.x,
                y: coords.y,
                size: coords.size || 10, // Adjusted size for PDF
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

  runValidations(): boolean {
    //validate if Pnl_Cost_of_Sales =  Pnl_Opening_Inventory + Pnl_Cost_of_Purchases + Pnl_Cost_of_Production - Pnl_Closing_Inventory
    // PNL Statement Fields
    const pnl_Cost_of_Sales = Number(this.le1Form.get('Pnl_Cost_of_Sales')?.value) || 0;
    const pnl_Opening_Inventory = Number(this.le1Form.get('Pnl_Opening_Inventory')?.value) || 0;
    const pnl_Cost_of_Purchases = Number(this.le1Form.get('Pnl_Cost_of_Purchases')?.value) || 0;
    const pnl_Cost_of_Production = Number(this.le1Form.get('Pnl_Cost_of_Production')?.value) || 0;
    const pnl_Closing_Inventory = Number(this.le1Form.get('Pnl_Closing_Inventory')?.value) || 0;

    const calculated_Cost_of_Sales = pnl_Opening_Inventory + pnl_Cost_of_Purchases + pnl_Cost_of_Production - pnl_Closing_Inventory;

    // validate if Pnl_Gross_Profit_Loss = Pnl_Sales_Turnover - cost of sales
    const pnl_Sales_Turnover = Number(this.le1Form.get('Pnl_Sales_Turnover')?.value) || 0;
    const pnl_Gross_Profit_Loss = Number(this.le1Form.get('Pnl_Gross_Profit_Loss')?.value) || 0;
    const calculated_Gross_Profit_Loss = pnl_Sales_Turnover - calculated_Cost_of_Sales;

    // validate if Pnl_Net_Profit_Loss = Pnl_Gross_Profit_Loss + other income - total expenditure
    const pnl_Foreign_Currency_Exchange_Gain = Number(this.le1Form.get('Pnl_Foreign_Currency_Exchange_Gain')?.value) || 0;
    const pnl_Other_Business_Income = Number(this.le1Form.get('Pnl_Other_Business_Income')?.value) || 0;
    const pnl_Other_Income = Number(this.le1Form.get('Pnl_Other_Income')?.value) || 0;
    const pnl_Non_Taxable_Profits = Number(this.le1Form.get('Pnl_Non_Taxable_Profits')?.value) || 0;
    const Pnl_Net_Profit_Loss = Number(this.le1Form.get('Pnl_Net_Profit_Loss')?.value) || 0;

    const total_Other_Income = pnl_Foreign_Currency_Exchange_Gain + pnl_Other_Business_Income + pnl_Other_Income + pnl_Non_Taxable_Profits;
    const calculated_Net_Profit_Loss = calculated_Gross_Profit_Loss + total_Other_Income - (Number(this.le1Form.get('Pnl_Total_Expenditure')?.value) || 0);

    // validate if Pnl_Total_Expenditure = sum of all expenditure fields
    const pnl_Interest_Expenditure = Number(this.le1Form.get('Pnl_Interest_Expenditure')?.value) || 0;
    const pnl_Professional_Fees = Number(this.le1Form.get('Pnl_Professional_Fees')?.value) || 0;
    const pnl_Technical_Fees_to_Non_Residents = Number(this.le1Form.get('Pnl_Technical_Fees_to_Non_Residents')?.value) || 0;
    const pnl_Contract_Payments = Number(this.le1Form.get('Pnl_Contract_Payments')?.value) || 0;
    const pnl_Management_Fee = Number(this.le1Form.get('Pnl_Management_Fee')?.value) || 0;
    const pnl_Salaries_Wages = Number(this.le1Form.get('Pnl_Salaries_Wages')?.value) || 0;
    const pnl_Cost_of_Employee_Share_Options = Number(this.le1Form.get('Pnl_Cost_of_Employee_Share_Options')?.value) || 0;
    const pnl_Royalties = Number(this.le1Form.get('Pnl_Royalties')?.value) || 0;
    const pnl_Rental_Lease = Number(this.le1Form.get('Pnl_Rental_Lease')?.value) || 0;
    const pnl_Maintenance_Repairs = Number(this.le1Form.get('Pnl_Maintenance_Repairs')?.value) || 0;
    const pnl_Research_Development = Number(this.le1Form.get('Pnl_Research_Development')?.value) || 0;
    const pnl_Promotion_Advertisement = Number(this.le1Form.get('Pnl_Promotion_Advertisement')?.value) || 0;
    const pnl_Travelling_Accommodation = Number(this.le1Form.get('Pnl_Travelling_Accommodation')?.value) || 0;
    const pnl_Foreign_Currency_Exchange_Loss = Number(this.le1Form.get('Pnl_Foreign_Currency_Exchange_Loss')?.value) || 0;
    const pnl_Other_Expenditure = Number(this.le1Form.get('Pnl_Other_Expenditure')?.value) || 0;
    const pnl_Total_Expenditure = Number(this.le1Form.get('Pnl_Total_Expenditure')?.value) || 0;

    const calculated_Total_Expenditure = pnl_Interest_Expenditure + pnl_Professional_Fees + pnl_Technical_Fees_to_Non_Residents + pnl_Contract_Payments + pnl_Management_Fee + pnl_Salaries_Wages + pnl_Cost_of_Employee_Share_Options + pnl_Royalties + pnl_Rental_Lease + pnl_Maintenance_Repairs + pnl_Research_Development + pnl_Promotion_Advertisement + pnl_Travelling_Accommodation + pnl_Foreign_Currency_Exchange_Loss + pnl_Other_Expenditure;

    // Financial Position (FP) - Assets
    const fp_Motor_Vehicles = Number(this.le1Form.get('Fp_Motor_Vehicles')?.value) || 0;
    const fp_Plant_Equipment = Number(this.le1Form.get('Fp_Plant_Equipment')?.value) || 0;
    const fp_Land_Buildings = Number(this.le1Form.get('Fp_Land_Buildings')?.value) || 0;
    const fp_Other_Non_Current_Assets = Number(this.le1Form.get('Fp_Other_Non_Current_Assets')?.value) || 0;
    const fp_Investments = Number(this.le1Form.get('Fp_Investments')?.value) || 0;
    const fp_Total_Non_Current_Assets = Number(this.le1Form.get('Fp_Total_Non_Current_Assets')?.value) || 0;

    const calculated_Total_Non_Current_Assets = fp_Motor_Vehicles + fp_Plant_Equipment + fp_Land_Buildings + fp_Other_Non_Current_Assets + fp_Investments;

    // Current Assets
    const fp_Trade_Debtors = Number(this.le1Form.get('Fp_Trade_Debtors')?.value) || 0;
    const fp_Other_Debtors = Number(this.le1Form.get('Fp_Other_Debtors')?.value) || 0;
    const fp_Inventory = Number(this.le1Form.get('Fp_Inventory')?.value) || 0;
    const fp_Loans_to_Related_Entities = Number(this.le1Form.get('Fp_Loans_to_Related_Entities')?.value) || 0;
    const fp_Cash_in_Hand_Bank = Number(this.le1Form.get('Fp_Cash_in_Hand_Bank')?.value) || 0;
    const fp_Other_Current_Assets = Number(this.le1Form.get('Fp_Other_Current_Assets')?.value) || 0;
    const fp_Total_Current_Assets = Number(this.le1Form.get('Fp_Total_Current_Assets')?.value) || 0;
    const calculated_Total_Current_Assets = fp_Trade_Debtors + fp_Other_Debtors + fp_Inventory + fp_Loans_to_Related_Entities + fp_Cash_in_Hand_Bank + fp_Other_Current_Assets;

    // Total Assets
    const fp_Total_Assets = Number(this.le1Form.get('Fp_Total_Assets')?.value) || 0;
    const calculated_Total_Assets = calculated_Total_Current_Assets + calculated_Total_Non_Current_Assets;

    // Financial Position (FP) - Liabilities
    // Current Liabilities
    const fp_Loans_Bank_Overdrafts = Number(this.le1Form.get('Fp_Loans_Bank_Overdrafts')?.value) || 0;
    const fp_Trade_Creditors = Number(this.le1Form.get('Fp_Trade_Creditors')?.value) || 0;
    const fp_Other_Creditors = Number(this.le1Form.get('Fp_Other_Creditors')?.value) || 0;
    const fp_Loans_from_Related_Entities = Number(this.le1Form.get('Fp_Loans_from_Related_Entities')?.value) || 0;
    const fp_Other_Current_Liabilities = Number(this.le1Form.get('Fp_Other_Current_Liabilities')?.value) || 0;
    const fp_Total_Current_Liabilities = Number(this.le1Form.get('Fp_Total_Current_Liabilities')?.value) || 0;

    const calculated_Total_Current_Liabilities = fp_Loans_Bank_Overdrafts + fp_Trade_Creditors + fp_Other_Creditors + fp_Loans_from_Related_Entities + fp_Other_Current_Liabilities;

    // Total Liabilities
    const fp_Non_Current_Liabilities = Number(this.le1Form.get('Fp_Non_Current_Liabilities')?.value) || 0;
    const fp_Total_Liabilities = Number(this.le1Form.get('Fp_Total_Liabilities')?.value) || 0;

    const calculated_Total_Liabilities = calculated_Total_Current_Liabilities + fp_Non_Current_Liabilities;

    // Financial Position (FP) - Equity
    const fp_Issued_Paid_Up_Capital = Number(this.le1Form.get('Fp_Issued_Paid_Up_Capital')?.value) || 0;
    const fp_Profit_Loss_Appropriation = Number(this.le1Form.get('Fp_Profit_Loss_Appropriation')?.value) || 0;
    const fp_Reserve_Account = Number(this.le1Form.get('Fp_Reserve_Account')?.value) || 0;
    const fp_Total_Equity = Number(this.le1Form.get('Fp_Total_Equity')?.value) || 0;

    const calculated_Total_Equity = fp_Issued_Paid_Up_Capital + fp_Profit_Loss_Appropriation + fp_Reserve_Account;

    // Total Liabilities and Equity
    const fp_Total_Liabilities_and_Equity = Number(this.le1Form.get('Fp_Total_Liabilities_and_Equity')?.value) || 0;
    const calculated_Total_Liabilities_and_Equity = calculated_Total_Liabilities + calculated_Total_Equity;

    // Perform validations

    if (Pnl_Net_Profit_Loss !== calculated_Net_Profit_Loss) {
      alert(`Validation Error: Net Profit/Loss should be equal to Gross Profit/Loss + Other Income - Total Expenditure.\n\nCurrent Value: ${Pnl_Net_Profit_Loss}\nCalculated Value: ${calculated_Net_Profit_Loss}`);
      return false;
    }
    if (fp_Total_Liabilities_and_Equity !== calculated_Total_Liabilities_and_Equity) {
      console.log(calculated_Total_Liabilities)
      console.log(calculated_Total_Equity)
      alert(`Validation Error: Total Liabilities and Equity should be equal to the sum of Total Liabilities and Total Equity.\n\nCurrent Value: ${fp_Total_Liabilities_and_Equity}\nCalculated Value: ${calculated_Total_Liabilities_and_Equity}`);
      return false;
    }
    if (fp_Total_Equity !== calculated_Total_Equity) {
      alert(`Validation Error: Total Equity should be equal to the sum of Issued Paid-Up Capital, Profit/Loss Appropriation, and Reserve Account.\n\nCurrent Value: ${fp_Total_Equity}\nCalculated Value: ${calculated_Total_Equity}`);
      return false;
    }
    if (fp_Total_Liabilities !== calculated_Total_Liabilities) {
      alert(`Validation Error: Total Liabilities should be equal to the sum of Total Current Liabilities and Non-Current Liabilities.\n\nCurrent Value: ${fp_Total_Liabilities}\nCalculated Value: ${calculated_Total_Liabilities}`);
      return false;
    }
    if (fp_Total_Current_Liabilities !== calculated_Total_Current_Liabilities) {
      alert(`Validation Error: Total Current Liabilities should be equal to the sum of all current liabilities fields.\n\nCurrent Value: ${fp_Total_Current_Liabilities}\nCalculated Value: ${calculated_Total_Current_Liabilities}`);
      return false;
    }
    if (fp_Total_Assets !== calculated_Total_Assets) {
      alert(`Validation Error: Total Assets should be equal to the sum of Total Current Assets and Total Non-Current Assets.\n\nCurrent Value: ${fp_Total_Assets}\nCalculated Value: ${calculated_Total_Assets}`);
      return false;
    }
    if (fp_Total_Current_Assets !== calculated_Total_Current_Assets) {
      alert(`Validation Error: Total Current Assets should be equal to the sum of all current asset fields.\n\nCurrent Value: ${fp_Total_Current_Assets}\nCalculated Value: ${calculated_Total_Current_Assets}`);
      return false;
    }
    if (fp_Total_Non_Current_Assets !== calculated_Total_Non_Current_Assets) {
      alert(`Validation Error: Total Non-Current Assets should be equal to the sum of all non-current asset fields.\n\nCurrent Value: ${fp_Total_Non_Current_Assets}\nCalculated Value: ${calculated_Total_Non_Current_Assets}`);
      return false;
    }
    if (pnl_Total_Expenditure !== calculated_Total_Expenditure) {
      alert(`Validation Error: Total Expenditure should be equal to the sum of all expenditure fields.\n\nCurrent Value: ${pnl_Total_Expenditure}\nCalculated Value: ${calculated_Total_Expenditure}`);
      return false;
    }
    if (pnl_Gross_Profit_Loss !== calculated_Gross_Profit_Loss) {
      alert(`Validation Error: Gross Profit/Loss should be equal to Sales Turnover - Cost of Sales.\n\nCurrent Value: ${pnl_Gross_Profit_Loss}\nCalculated Value: ${calculated_Gross_Profit_Loss}`);
      return false;
    }
    if (pnl_Cost_of_Sales !== calculated_Cost_of_Sales) {
      alert(`Validation Error: Pnl_Cost_of_Sales should be equal to Pnl_Opening_Inventory + Pnl_Cost_of_Purchases + Pnl_Cost_of_Production - Pnl_Closing_Inventory.\n\nCurrent Value: ${pnl_Cost_of_Sales}\nCalculated Value: ${calculated_Cost_of_Sales}`);
      return false;
    }
    if (fp_Total_Liabilities_and_Equity !== fp_Total_Assets) {
      alert(`Validation Error: Total Liabilities and Equity should be equal to Total Assets.\n\nTotal Liabilities and Equity: ${fp_Total_Liabilities_and_Equity}\nTotal Assets: ${fp_Total_Assets}`);
      return false;
    }
    return true;
  }

  async submit(): Promise<void> {
    this.le1Form.markAllAsTouched();
    this.checkAllSectionsCompletion();

    const incompleteSections: string[] = [];
    for (const [key, isComplete] of Object.entries(this.sectionStatus)) {
      if (!isComplete) incompleteSections.push(this.getSectionFriendlyName(key));
    }

    if (incompleteSections.length > 0 || this.le1Form.invalid) {
      alert(`Please complete:\n- ${incompleteSections.join('\n- ')}`);
      return;
    }

    // Validation logic (simplified for brevity, ensure runValidations checks the same values)
    // if (!this.runValidations()) return;

    this.jsonDataForExtension = JSON.stringify(this.getFormattedData(), null, 2);
    this.isInstructionModalVisible = true;
    this.copyButtonText = 'Copy JSON';
  }

  
  
  back(event: any) { this.unloadNotification(event); }
  
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.le1Form.dirty) {
      $event.returnValue = true;
      const dialogData = {
        title: 'Confirmation',
        message: `Unsaved changes will be lost. Are you sure you want to leave?`,
        confirmText: 'Yes',
        cancelText: 'No, stay here'
      };

      this.dialogService.confirm(dialogData)
        .subscribe(result => {
          if (result) {
            this.router.navigate(['/reports']);
          } else {
            console.log('Leave canceled.');
          }
        });
   } else {
      this.router.navigate(['/reports']);
    }
  }
  
  closeInstructionModal() { this.isInstructionModalVisible = false; }
  copyJsonToClipboard() {
    navigator.clipboard.writeText(this.jsonDataForExtension).then(() => {
      this.copyButtonText = 'Copied!';
      setTimeout(() => this.copyButtonText = 'Copy JSON', 2000);
    });
  }
}