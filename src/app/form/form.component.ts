// src/app/form/form.component.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, ThousandSeparatorDirective,
    AutoResizeDirective
  ],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent implements OnInit {
  le1Form: FormGroup;
  isInstructionModalVisible = false; // Controls the visibility of our new modal
  jsonDataForExtension = '';         // Will hold the pretty-formatted JSON for the user to copy
  copyButtonText = 'Copy JSON';
  initialFormData: any;
  isLoading: boolean = false;
  sidebarOpen = false;
  private apiUrl = baseUrl;
  projectId: any;
  sectionStatus: { [key: string]: boolean } = {};
  businessActivities: { code: string, description: string }[] = [
    { code: '00001', description: 'Labuan insurer, Labuan reinsurer, Labuan takaful operator or Labuan retakaful operator' },
    { code: '00002', description: 'Labuan underwriting manager or Labuan underwriting takaful manager' },
    { code: '00003', description: 'Labuan insurance manager or Labuan takaful manager' },
    { code: '00004', description: 'Labuan insurance broker or Labuan takaful broker' },
    { code: '00005', description: 'Labuan captive insurer or Labuan captive takaful' },
    { code: '00006', description: 'Labuan International Commodity Trading Company' },
    { code: '00007', description: 'Labuan bank, Labuan investment bank, Labuan Islamic bank or Labuan Islamic investment bank' },
    { code: '00008', description: 'Labuan trust company' },
    { code: '00009', description: 'Labuan leasing company or Labuan Islamic leasing company' },
    { code: '00010', description: 'Labuan credit token company or Labuan Islamic credit token company' },
    { code: '00011', description: 'Labuan development finance company or Labuan Islamic development finance company' },
    { code: '00012', description: 'Labuan building credit company or Labuan Islamic building credit company' },
    { code: '00013', description: 'Labuan factoring company or Labuan Islamic factoring company' },
    { code: '00014', description: 'Labuan money broker or Labuan Islamic money broker' },
    { code: '00015', description: 'Labuan fund manager' },
    { code: '00016', description: 'Labuan securities licensee or Labuan Islamic securities licensee' },
    { code: '00017', description: 'Labuan fund administrator' },
    { code: '00018', description: 'Labuan company management' },
    { code: '00019', description: 'Labuan International Financial Exchange' },
    { code: '00020', description: 'Self-regulatory organisation or Islamic self-regulation organisation' },
    { code: '00021', description: 'Labuan entity that undertakes investment holding activities other than pure equity holding activities' },
    { code: '00022', description: 'Labuan entity that undertakes pure equity holding activities' },
    { code: '00023', description: 'Labuan entity that carries out administrative services, accounting services, legal services, backroom processing services, payroll services, talent management services, agency services, insolvency related services and management services other than Labuan company management under code 00018' }
  ];

  incentiveCodes: { code: string }[] = [
    { code: '801' },
    { code: '802' },
    { code: '803' },
  ]

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
    ['1', 'Labuan Company'],
    ['2', 'Labuan Foundation'],
    ['3', 'Labuan Islamic Foundation'],
    ['4', 'Labuan Islamic partnership'],
    ['5', 'Labuan limited partnership'],
    ['6', 'Labuan Limited Liability Partnership'],
    ['7', 'Labuan Islamic trust'],
    ['8', 'Labuan trust'],
    ['9', 'Malaysian Islamic bank licensee'],
    ['10', 'Malaysian bank licensee'],
    ['11', 'Any Labuan financial institutions'],
    ['12', 'Any person declared by the Minister to be a Labuan entity']
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
      // Year_of_Assessment_1: [''],
      // Year_of_Assessment_2: [''],
      // Year_of_Assessment_3: [''],
      // Year_of_Assessment_4: [''],
      Company_Name: [''],
      // Company_Address_Line1: [''],
      // Company_Address_Line2: [''],
      // Postcode: [''],
      // City: [''],
      // State: [''],
      Company_Registration_No: [''],
      // Company_TIN_LE: [''],
      // TIN_C_or_PT: [''],
      // Employer_TIN: [''],
      // Incorp_date_day: [''],
      // Incorp_date_month: [''],
      // Incorp_date_year: [''],
      // Telephone_no: [''],
      Email: [''],
      Change_of_Accounting_Period_No: [''],
      Types_of_exchange_of_accounting_periods: [''],
      // Accounting_Period_From = date with format 'dd/mm/yyyy'

      Accounting_Period_From: [''],
      // Accounting_Period_From_Month: [''],
      // Accounting_Period_From_Year: [''],
      Accounting_Period_To: [''],
      // Accounting_Period_To_Month: [''],
      // Accounting_Period_To_Year: [''],
      Basis_Period_From: [''],
      // Basis_Period_From_Month: [''],
      // Basis_Period_From_Year: [''],
      Basis_Period_To: [''],
      // Basis_Period_To_Month: [''],
      // Basis_Period_To_Year: [''],
      FS_in_Foreign_Currency_Yes: [''],
      Currency_Reported: [''],
      Currency_Exchange_Rate: [0],
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
      Declaration_Date: [''],
      // Declaration_Date_Month: [''],
      // Declaration_Date_Year: [''],
      Declarant_Designation: [''],
      Designation_Others: [''],

      // Attachment C3: Compliance Officers
      // C3 Row 1
      Compliance_Officers_0_Name: [''],
      Compliance_Officers_0_Claim_PUA_419_2011: [''],
      Compliance_Officers_0_Designation: [''],
      Compliance_Officers_0_Country: [''],
      Compliance_Officers_0_Address: [''],
      Compliance_Officers_0_ID_type: [''],
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
      Compliance_Officers_1_Country: [''],
      Compliance_Officers_1_Address: [''],
      Compliance_Officers_1_ID_type: [''],
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
      Compliance_Officers_2_Country: [''],
      Compliance_Officers_2_Address: [''],
      Compliance_Officers_2_ID_type: [''],
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
      Compliance_Officers_3_Country: [''],
      Compliance_Officers_3_Address: [''],
      Compliance_Officers_3_ID_type: [''],
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
      Compliance_Officers_4_Country: [''],
      Compliance_Officers_4_Address: [''],
      Compliance_Officers_4_ID_type: [''],
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
      Major_Shareholders_0_Country: [''],
      Major_Shareholders_0_Address: [''],
      Major_Shareholders_0_ID_Passport_Reg_No: [''],
      Major_Shareholders_0_Date_of_Birth: [''],
      Major_Shareholders_0_Country_of_Origin: [''],
      Major_Shareholders_0_TIN: [''],
      Major_Shareholders_0_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_0_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 2
      Major_Shareholders_1_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_1_Country: [''],
      Major_Shareholders_1_Address: [''],
      Major_Shareholders_1_ID_Passport_Reg_No: [''],
      Major_Shareholders_1_Date_of_Birth: [''],
      Major_Shareholders_1_Country_of_Origin: [''],
      Major_Shareholders_1_TIN: [''],
      Major_Shareholders_1_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_1_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 3
      Major_Shareholders_2_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_2_Country: [''],
      Major_Shareholders_2_Address: [''],
      Major_Shareholders_2_ID_Passport_Reg_No: [''],
      Major_Shareholders_2_Date_of_Birth: [''],
      Major_Shareholders_2_Country_of_Origin: [''],
      Major_Shareholders_2_TIN: [''],
      Major_Shareholders_2_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_2_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 4
      Major_Shareholders_3_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_3_Country: [''],
      Major_Shareholders_3_Address: [''],
      Major_Shareholders_3_ID_Passport_Reg_No: [''],
      Major_Shareholders_3_Date_of_Birth: [''],
      Major_Shareholders_3_Country_of_Origin: [''],
      Major_Shareholders_3_TIN: [''],
      Major_Shareholders_3_Direct_Shareholding_Percentage: [''],
      Major_Shareholders_3_Dividends_Received_in_Basis_Period: [''],
      // C4 Row 5
      Major_Shareholders_4_Name_of_Shareholder_Partner: [''],
      Major_Shareholders_4_Country: [''],
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
      Beneficial_Owner_0_Country: [''],
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
      Beneficial_Owner_1_Country: [''],
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
      Beneficial_Owner_2_Country: [''],
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
      Beneficial_Owner_3_Country: [''],
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
      Beneficial_Owner_4_Country: [''],
      Beneficial_Owner_4_Address: [''],
      Beneficial_Owner_4_ID_Passport_No: [''],
      Beneficial_Owner_4_Date_of_Birth: [''],
      Beneficial_Owner_4_Telephone_No: [''],
      Beneficial_Owner_4_Fees_Commission_Allowance: [''],

      // Attachment C9: Financial Particulars
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

    // Handle conditional visibility for CbC Reporting sections
    this.le1Form.get('D1_Subject_to_CbCR')?.valueChanges.subscribe(value => {
      const p_E = ['E1_MNE_Group_Name', 'E2_Accounting_Period_From_Day', 'E2_Accounting_Period_From_Month', 'E2_Accounting_Period_From_Year', 'E2_Accounting_Period_To_Day', 'E2_Accounting_Period_To_Month', 'E2_Accounting_Period_To_Year', 'E3_Constituent_Entities_in_Malaysia', 'E4_Constituent_Entities_outside_Malaysia'];
      const p_F = ['F1_Reporting_Entity_Name', 'F2_TIN', 'F3_Country_of_Residence', 'F4_Accounting_Period_From_Day', 'F4_Accounting_Period_From_Month', 'F4_Accounting_Period_From_Year', 'F4_Accounting_Period_To_Day', 'F4_Accounting_Period_To_Month', 'F4_Accounting_Period_To_Year', 'F5_MNE_Group_Name', 'F6_Status_of_Reporting_Entity', 'F7a_Ultimate_Holding_Entity_Name', 'F7b_Country_of_Residence_UHE'];

      if (value === '1') { // "Yes"
        p_E.forEach(c => this.le1Form.get(c)?.enable());
        p_F.forEach(c => this.le1Form.get(c)?.enable());
      } else { // "No" or other values
        p_E.forEach(c => this.le1Form.get(c)?.disable());
        p_F.forEach(c => this.le1Form.get(c)?.disable());
      }
    });

    this.le1Form.get('Business_Activity_Code')?.valueChanges.subscribe(code => {
      this.updateBusinessActivityDescription(code);
    });

    this.le1Form.get('Type_of_Labuan_entity')?.valueChanges.subscribe(value => {
      this.updateFpLabuanEntityType(value);
    });
  }

  updateBusinessActivityDescription(code: string | null): void {
    const activity = this.businessActivities.find(a => a.code === code);
    const description = activity ? activity.description : '';
    // Use setValue to update the form control; { emitEvent: false } prevents re-triggering valueChanges
    this.le1Form.get('Type_of_business_activity')?.setValue(description, { emitEvent: false });
  }

  updateFpLabuanEntityType(value: string | null): void {
    const entityTypeLabel = this.labuanEntityTypes.get(value || '') || '';
    this.le1Form.get('Fp_Type_of_Labuan_entity')?.setValue(entityTypeLabel, { emitEvent: false });
  }

  /**
   * Checks if a single field has a value.
   */
  isFieldComplete(fieldName: string): any {
    const control = this.le1Form.get(fieldName);
    return control && control.value !== null && control.value !== undefined && control.value !== '';
  }

  /**
   * Validates a table section. A table is complete if there are no partially filled rows.
   * @param rowCount The number of rows in the table.
   * @param fieldPrefix The prefix for the form control names in the table (e.g., 'Compliance_Officers_').
   * @param fieldSuffixes An array of suffixes for the fields in each row (e.g., ['Name', 'Designation']).
   */
  isTableComplete(rowCount: number, fieldPrefix: string, fieldSuffixes: string[]): boolean {
    for (let i = 0; i < rowCount; i++) {
      const rowFieldValues = fieldSuffixes.map(suffix => this.le1Form.get(`${fieldPrefix}${i}_${suffix}`)?.value);

      const filledFields = rowFieldValues.filter(v => v !== null && v !== undefined && v !== '').length;

      // A row is invalid if it's partially filled (not completely empty and not completely full)
      if (filledFields > 0 && filledFields < fieldSuffixes.length) {
        return false; // Incomplete
      }
    }
    return true; // Complete
  }

  checkAllSectionsCompletion(): void {
    // Part A: Basic Particulars
    this.sectionStatus['part-a'] = [
      'Year_of_Assessment_1', 'Year_of_Assessment_2', 'Year_of_Assessment_3', 'Year_of_Assessment_4',
      'Company_Name', 'Company_Address_Line1', 'Postcode', 'City', 'State', 'Change_of_Accounting_Period_No'
    ].every(field => this.isFieldComplete(field));

    // Part B: Tax Computation (including table validation)
    const b1Suffixes = [
      'Business_Activity_Code', 'Core_Income_Activity_Yes', 'Business_Activity_Status_Active',
      'No_of_Employees', 'Annual_Operating_Expenditure', 'Compliance_with_FPEC', 'Compliance_with_CML',
      'No_of_Employees_Malaysia', 'No_of_Related_Company', 'Comply_Substantive_Yes',
      'Amount_of_Net_Loss', 'Net_Profits_ex_IP'
    ];
    this.sectionStatus['part-b'] = this.isTableComplete(5, 'B1_Row', b1Suffixes) &&
      ['B2_Total_Net_Profits', 'B6_Tax_Payable'].every(f => this.isFieldComplete(f));

    // Attachment C3: Compliance Officers
    const c3Suffixes = ['Name', 'Designation', 'Address', 'ID_Passport_No', 'Date_of_Birth', 'TIN', 'Telephone_No', 'Salary_Bonus', 'Fees_Commission_Allowances', 'Total_Loan_to_Officer', 'Total_Loan_from_Officer']; // Example required fields
    this.sectionStatus['attachment-c3'] = this.isTableComplete(5, 'Compliance_Officers', c3Suffixes);

    // ... Add similar checks for all other sections and tables ...
  }

  loadProjectData(projectId: any): void {
    this.isLoading = true;
    this.http.get<any>(`${this.apiUrl}/getProjectDetails/${projectId}`).subscribe({
      next: (response) => {
        if (response && response[0].data) {
          this.le1Form.patchValue(response[0].data);

          this.updateBusinessActivityDescription(response[0].data.Business_Activity_Code);

          // ==================== START OF MODIFICATION ====================
          // 4. Also update the Labuan entity type description when data is loaded.
          this.updateFpLabuanEntityType(response[0].data.Type_of_Labuan_entity);
          this.checkAllSectionsCompletion(); // Check completion status AFTER data is loaded
          console.log('Form successfully patched with data from API.');
        } else {
          console.error('Invalid data structure received from API:', response);
          alert('Failed to load project data due to incorrect format.');
          this.router.navigate(['/reports']);
        }
      },
      error: (err) => {
        console.error('Error fetching project details:', err);
        alert('An error occurred while fetching project data.');
        this.router.navigate(['/reports']);
      },
      complete: () => {
        setTimeout(() => { this.isLoading = false; }, 500);
      }
    });
  }

  back($event: Event) {
    this.unloadNotification($event);
  }

  saveProject(): void {
    if (!this.projectId) {
      alert('No project is currently loaded. Cannot save data.');
      return;
    }

    if (this.le1Form.invalid) {
      alert('The form is invalid. Please check all fields before saving.');
      return;
    }

    this.isLoading = true;
    const formData = this.le1Form.value;
    const requestBody = { data: formData };

    this.http.put(`${this.apiUrl}/updateProjectDetails/${this.projectId}`, requestBody).subscribe({
      next: (response) => {
        console.log('Project update successful', response);
        alert('Project data has been saved successfully!');
      },
      error: (err) => {
        console.error('Error updating project details:', err);
        alert('An error occurred while saving the project. Please try again.');
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
    // 1. Run all existing validations first.
    if (!this.runValidations()) {
      console.log('Local validation failed. Aborting submission.');
      return; // Stop if validation fails
    }

    // 2. Prepare the JSON data for the extension.
    // Using getRawValue() to include all fields, and formatting it with an indent of 2 spaces.
    const formData = this.le1Form.getRawValue();
    this.jsonDataForExtension = JSON.stringify(formData, null, 2);

    // 3. Show the instruction modal.
    this.isInstructionModalVisible = true;
    this.copyButtonText = 'Copy JSON'; // Reset button text
  }

  closeInstructionModal(): void {
    this.isInstructionModalVisible = false;
  }

  copyJsonToClipboard(): void {
    navigator.clipboard.writeText(this.jsonDataForExtension).then(() => {
      this.copyButtonText = 'Copied!';
      setTimeout(() => {
        this.copyButtonText = 'Copy JSON';
      }, 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Could not copy JSON to clipboard. Please copy it manually.');
    });
  }

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
}