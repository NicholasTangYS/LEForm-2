import { Component } from '@angular/core';
import * as echarts from 'echarts';
import { CurrencyPipe } from '@angular/common';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  kpis = {
    totalRevenue: 45231.89,
    netProfit: 12789.34,
    newCustomers: 1250,
    conversionRate: 89
  };

  ngOnInit(): void {
    this.initCashFlowChart();
    this.initIncomeExpenseChart();
  }

  initCashFlowChart(): void {
    const chartDom = document.getElementById('cash-flow-chart')!;
    const myChart = echarts.init(chartDom);
    


    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        top: '5%',
        left: 'center'
      },
      series: [
        {
          name: 'Access From',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 40,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 1048, name: 'Search Engine' },
            { value: 735, name: 'Direct' },
            { value: 580, name: 'Email' },
            { value: 484, name: 'Union Ads' },
            { value: 300, name: 'Video Ads' },
            
          ]
        }
      ]
    }

    myChart.setOption(option);
  }

  initIncomeExpenseChart(): void {
    const chartDom = document.getElementById('income-expense-chart')!;
    const myChart = echarts.init(chartDom);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {},
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        { name: 'Income', type: 'bar', emphasis: { focus: 'series' }, data: [320, 332, 301, 334, 390, 330, 320] },
        { name: 'Expense', type: 'bar', stack: 'Ad', emphasis: { focus: 'series' }, data: [120, 132, 101, 134, 90, 230, 210] }
      ]
    };

    myChart.setOption(option);
  }
}
