
const truthSocialCSVUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3H1oRfz6oAreLUaEs48mUaz4VcGz2WLD-ge4S2Mg2TgoaIikAIzDeDgkAqVU-tOu7-kXSbj7E5a0P/pub?gid=201966548&single=true&output=csv';
const twitterCSVUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3H1oRfz6oAreLUaEs48mUaz4VcGz2WLD-ge4S2Mg2TgoaIikAIzDeDgkAqVU-tOu7-kXSbj7E5a0P/pub?gid=0&single=true&output=csv';

let allData = [];
let yearlyData = {};

function parseCSV(url, platform, callback) {
  Papa.parse(url, {
    download: true,
    header: true,
    complete: function(results) {
      const data = results.data.map(row => ({ ...row, Platform: platform }));
      callback(data);
    }
  });
}

// Load both CSVs
parseCSV(truthSocialCSVUrl, 'Truth Social', data1 => {
  allData = allData.concat(data1);

  parseCSV(twitterCSVUrl, 'Twitter', data2 => {
    allData = allData.concat(data2);
    processData(allData);
  });
});

function processData(data) {
  // Aggregate by Year -> Month -> Day
  yearlyData = {};
  data.forEach(row => {
    if (!row.Date) return;
    const date = new Date(row.Date);
    if (isNaN(date)) return;

    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();

    if (!yearlyData[year]) yearlyData[year] = {};
    if (!yearlyData[year][month]) yearlyData[year][month] = [];
    yearlyData[year][month].push({ ...row, Day: day });
  });

  setupDropdowns();
  updateChart('all', 'all', 'all');
}

function setupDropdowns() {
  const yearSelect = document.getElementById('yearSelect');
  yearSelect.innerHTML = '<option value="all">All Years</option>';
  Object.keys(yearlyData).sort().forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  const monthSelect = document.getElementById('monthSelect');
  monthSelect.innerHTML = '<option value="all">All Months</option>';

  document.getElementById('platformSelect').addEventListener('change', () => {
    updateChart(yearSelect.value, monthSelect.value, document.getElementById('platformSelect').value);
  });

  yearSelect.addEventListener('change', () => {
    const year = yearSelect.value;
    populateMonthDropdown(year);
    updateChart(year, monthSelect.value, document.getElementById('platformSelect').value);
  });

  monthSelect.addEventListener('change', () => {
    updateChart(yearSelect.value, monthSelect.value, document.getElementById('platformSelect').value);
  });
}

function populateMonthDropdown(year) {
  const monthSelect = document.getElementById('monthSelect');
  monthSelect.innerHTML = '<option value="all">All Months</option>';
  if (year === 'all') return;
  Object.keys(yearlyData[year]).sort((a,b) => new Date(`${a} 1, ${year}`) - new Date(`${b} 1, ${year}`))
    .forEach(month => {
      const opt = document.createElement('option');
      opt.value = month;
      opt.textContent = month;
      monthSelect.appendChild(opt);
    });
}

function updateChart(selectedYear, selectedMonth, selectedPlatform) {
  let labels = [];
  let datasets = [];
  const platforms = ['Truth Social', 'Twitter'];

  if (selectedMonth === 'all') {
    // Aggregate by month or year
    if (selectedYear === 'all') {
      // Yearly totals by platform
      labels = Object.keys(yearlyData).sort();
      datasets = platforms.map(platform => {
        return {
          label: platform,
          data: labels.map(y => {
            let count = 0;
            Object.values(yearlyData[y]).forEach(monthArray => {
              count += monthArray.filter(r => selectedPlatform==='all'?true:r.Platform===selectedPlatform).filter(r => r.Platform===platform).length;
            });
            return count;
          }),
          borderColor: platform==='Truth Social'?'red':'blue',
          backgroundColor: platform==='Truth Social'?'rgba(255,0,0,0.1)':'rgba(0,0,255,0.1)',
          fill: true,
          tension: 0.3
        };
      });
    } else {
      // Monthly totals within selected year
      labels = Object.keys(yearlyData[selectedYear]).sort((a,b) => new Date(`${a} 1, ${selectedYear}`) - new Date(`${b} 1, ${selectedYear}`));
      datasets = platforms.map(platform => {
        return {
          label: platform,
          data: labels.map(month => yearlyData[selectedYear][month].filter(r => selectedPlatform==='all'?true:r.Platform===selectedPlatform).filter(r=>r.Platform===platform).length),
          borderColor: platform==='Truth Social'?'red':'blue',
          backgroundColor: platform==='Truth Social'?'rgba(255,0,0,0.1)':'rgba(0,0,255,0.1)',
          fill:true,
          tension:0.3
        };
      });
    }
  } else {
    // Daily view for selected month
    const rows = yearlyData[selectedYear][selectedMonth].filter(r => selectedPlatform==='all'?true:r.Platform===selectedPlatform);
    const dailyCounts = {};
    rows.forEach(r => {
      const dayLabel = `${selectedMonth} ${r.Day}`;
      dailyCounts[dayLabel] = (dailyCounts[dayLabel] || 0) + 1;
    });
    labels = Object.keys(dailyCounts).sort((a,b)=> new Date(`${a}, ${selectedYear}`) - new Date(`${b}, ${selectedYear}`));
    datasets = [{
      label: selectedPlatform==='all'?'Posts':selectedPlatform,
      data: labels.map(d => dailyCounts[d]),
      borderColor:'green',
      backgroundColor:'rgba(0,128,0,0.1)',
      fill:true,
      tension:0.3
    }];
  }

  const ctx = document.getElementById('frequencyChart').getContext('2d');
  if (!frequencyChart) {
    frequencyChart = new Chart(ctx, {
      type:'line',
      data: { labels, datasets },
      options: {
        responsive:true,
        plugins:{ tooltip:{mode:'index',intersect:false}, legend:{display:true}, title:{display:true,text:'Posts Over Time'} },
        interaction:{mode:'nearest', axis:'x', intersect:false},
        scales:{ y:{beginAtZero:true, title:{display:true,text:'Number of Posts'}}, x:{title:{display:true, text:selectedMonth==='all'?'Month':'Day'}} },
        onClick: (event, elements, chart) => {
          if (!elements.length) return;
          const index = elements[0].index;
          const clickedLabel = chart.data.labels[index];
          if(selectedMonth==='all') {
            // Drill to daily
            document.getElementById('monthSelect').value = clickedLabel;
            document.getElementById('monthSelect').dispatchEvent(new Event('change'));
          } else {
            showQuotes(clickedLabel, selectedYear, selectedMonth, selectedPlatform);
          }
        }
      }
    });
  } else {
    frequencyChart.data.labels = labels;
    frequencyChart.data.datasets = datasets;
    frequencyChart.options.scales.x.title.text = selectedMonth==='all'?'Month':'Day';
    frequencyChart.update();
  }

  document.getElementById('quotesList').innerHTML = '';
}

function showQuotes(clickedDayLabel, year, month, platform) {
  const rows = yearlyData[year][month].filter(r => platform==='all'?true:r.Platform===platform)
    .filter(r => `${month} ${r.Day}` === clickedDayLabel);

  const quotesList = document.getElementById('quotesList');
  quotesList.innerHTML = '';

  rows.forEach(row => {
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
    if (row.Content) content += `<div><strong>Content:</strong> ${row.Content}</div>`;
    if (row.Type) content += `<div><strong>Type:</strong> ${row.Type}</div>`;
    if (row.Quote) content += `<div><strong>Quote:</strong> ${row.Quote}</div>`;
    if (row.Tags) content += `<div><strong>Tags:</strong> ${row.Tags}</div>`;
    if (row.Platform) content += `<div><strong>Platform:</strong> ${row.Platform}</div>`;

    li.innerHTML = content;
    quotesList.appendChild(li);
  });
}