const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3H1oRfz6oAreLUaEs48mUaz4VcGz2WLD-ge4S2Mg2TgoaIikAIzDeDgkAqVU-tOu7-kXSbj7E5a0P/pub?output=csv';

Papa.parse(csvUrl, {
    download: true,
    header: true, // assumes your CSV has column headers
    complete: function(results) {
      const data = results.data;
  
      
      // 1. Aggregate posts by month
      const frequencyCounts = {};
  
      data.forEach(row => {
        if (!row.Date) return; // skip empty dates
        const date = new Date(row.Date);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' }); 
        frequencyCounts[month] = (frequencyCounts[month] || 0) + 1;
      });
  
      // 2. Sort months chronologically
      const labels = Object.keys(frequencyCounts)
        .sort((a, b) => new Date(a) - new Date(b));
      const counts = labels.map(label => frequencyCounts[label]);
  
      // 3. Create the chart
      const ctxFreq = document.getElementById('frequencyChart').getContext('2d');
      new Chart(ctxFreq, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Anti-Press Posts',
            data: counts,
            borderColor: 'red',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 8
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              mode: 'index',
              intersect: false
            },
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Anti-Press Posts Over Time'
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Posts'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Month'
              }
            }
          }
        }
      });
    }
  });

  const monthSelect = document.getElementById('monthSelect');

  // After parsing CSV and building monthlyData:
  const months = Object.keys(monthlyData).sort((a,b) => new Date(a) - new Date(b));
  
  // Add months to dropdown
  months.forEach(month => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
  });

  monthSelect.addEventListener('change', () => {
    const selectedMonth = monthSelect.value;
  
    let filteredLabels, filteredCounts;
    if (selectedMonth === 'all') {
      filteredLabels = labels;
      filteredCounts = counts;
    } else {
      filteredLabels = [selectedMonth];
      filteredCounts = [monthlyData[selectedMonth].length];
    }
  
    frequencyChart.data.labels = filteredLabels;
    frequencyChart.data.datasets[0].data = filteredCounts;
    frequencyChart.update();
  });
  
  
  