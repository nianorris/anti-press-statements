const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3H1oRfz6oAreLUaEs48mUaz4VcGz2WLD-ge4S2Mg2TgoaIikAIzDeDgkAqVU-tOu7-kXSbj7E5a0P/pub?output=csv';

Papa.parse(csvUrl, {
  download: true,
  header: true,
  complete: function(results) {
    const data = results.data;

    // Aggregate posts by month
    const monthlyData = {};
    data.forEach(row => {
      if (!row.Date) return;
      const date = new Date(row.Date);
      if (isNaN(date)) return;

      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(row);
    });

    // Labels and counts for monthly chart
    const labels = Object.keys(monthlyData).sort((a,b) => new Date(a) - new Date(b));
    const counts = labels.map(label => monthlyData[label].length);

    // Chart
    const ctxFreq = document.getElementById('frequencyChart').getContext('2d');
    let frequencyChart = new Chart(ctxFreq, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Anti-Press Posts',
          data: counts,
          borderColor: 'red',
          backgroundColor: 'rgba(255,0,0,0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: { mode: 'index', intersect: false },
          legend: { display: false },
          title: { display: true, text: 'Anti-Press Posts Over Time' }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Number of Posts' } },
          x: { title: { display: true, text: 'Month' } }
        },
        onClick: (event, elements, chart) => {
          if (!elements.length) return;
          const index = elements[0].index;
          const clickedLabel = chart.data.labels[index];

          if (monthSelect.value === 'all') {
            // Monthly view → drill down to daily view
            monthSelect.value = clickedLabel;
            monthSelect.dispatchEvent(new Event('change'));
          } else {
            // Daily view → show quotes for that day
            const selectedMonth = monthSelect.value;
            const rows = monthlyData[selectedMonth];
            const dayRows = rows.filter(row => {
              const date = new Date(row.Date);
              const dayLabel = date.toLocaleString('default', { month: 'short', day: 'numeric' });
              return dayLabel === clickedLabel;
            });

            const quotesList = document.getElementById('quotesList');
            quotesList.innerHTML = '';

            dayRows.forEach(row => {
              const li = document.createElement('li');
              li.style.marginBottom = '10px';
              li.style.padding = '10px';
              li.style.border = '1px solid #ccc';
              li.style.borderRadius = '5px';
              li.style.backgroundColor = '#f9f9f9';
              li.style.listStyle = 'none';

              let content = '';
              if (row.Link) content += `<div><a href="${row.Link}" target="_blank">View Source</a></div>`;
              if (row.Date) content += `<div><strong>Date:</strong> ${new Date(row.Date).toLocaleDateString()}</div>`;
              if (row.Type) content += `<div><strong>Type:</strong> ${row.Type}</div>`;
              if (row.Quote) content += `<div><strong>Content:</strong> ${row.Quote}</div>`;
              if (row.Tags) content += `<div><strong>Tags:</strong> ${row.Tags}</div>`;

              li.innerHTML = content;
              quotesList.appendChild(li);
            });
          }
        }
      }
    });

    // Populate month dropdown
    const monthSelect = document.getElementById('monthSelect');
    labels.forEach(month => {
      const option = document.createElement('option');
      option.value = month;
      option.textContent = month;
      monthSelect.appendChild(option);
    });

    // Dropdown filter logic
    monthSelect.addEventListener('change', () => {
      const selectedMonth = monthSelect.value;

      if (selectedMonth === 'all') {
        // Show monthly overview
        frequencyChart.data.labels = labels;
        frequencyChart.data.datasets[0].data = counts;
        frequencyChart.options.scales.x.title.text = 'Month';
        frequencyChart.options.plugins.title.text = 'Anti-Press Posts Over Time';
        document.getElementById('quotesList').innerHTML = '';
      } else {
        // Show daily breakdown
        const rows = monthlyData[selectedMonth];
        const dailyCounts = {};
        rows.forEach(row => {
          const date = new Date(row.Date);
          if (!isNaN(date)) {
            const dayLabel = date.toLocaleString('default', { month: 'short', day: 'numeric' });
            dailyCounts[dayLabel] = (dailyCounts[dayLabel] || 0) + 1;
          }
        });

        const year = selectedMonth.split(' ')[1];
        const dayLabels = Object.keys(dailyCounts).sort((a,b) => {
          const aDate = new Date(`${a} ${year}`);
          const bDate = new Date(`${b} ${year}`);
          return aDate - bDate;
        });

        const dayData = dayLabels.map(day => dailyCounts[day]);
        frequencyChart.data.labels = dayLabels;
        frequencyChart.data.datasets[0].data = dayData;
        frequencyChart.options.scales.x.title.text = 'Day';
        frequencyChart.options.plugins.title.text = `Anti-Press Posts in ${selectedMonth}`;
        document.getElementById('quotesList').innerHTML = '';
      }

      frequencyChart.update();
    });
  }
});