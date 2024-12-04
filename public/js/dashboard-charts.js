/**
 * Dashboard Charts
 * Client-side chart initialization using Chart.js
 */

let stockMovementChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initStockMovementChart(7);

    // Add dropdown change handler
    const daysSelect = document.getElementById('stockTrendsDays');
    if (daysSelect) {
        daysSelect.addEventListener('change', (e) => {
            const days = parseInt(e.target.value) || 7;
            initStockMovementChart(days);
        });
    }
});

/**
 * Initialize the Stock Movement Trend Chart
 * @param {number} days - Number of days to display (7, 30, 90)
 */
async function initStockMovementChart(days = 7) {
    const canvas = document.getElementById('activityChart');
    if (!canvas) {
        console.warn('Activity chart canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');

    // Show loading state
    const chartContainer = canvas.parentElement;
    chartContainer.classList.add('loading');

    // Remove any existing error message
    const existingError = chartContainer.querySelector('.chart-error');
    if (existingError) {
        existingError.remove();
    }
    canvas.style.display = 'block';

    try {
        // Fetch chart data from API with days parameter
        const response = await fetch(`/api/charts/stock-movement?days=${days}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load chart data');
        }

        // Brand colors
        const brandBlue = '#2563EB';

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');

        // Destroy existing chart if it exists
        if (stockMovementChart) {
            stockMovementChart.destroy();
        }

        // Initialize Chart.js Line Chart
        stockMovementChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Stock Movements',
                    data: data.data,
                    borderColor: brandBlue,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: brandBlue,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: days <= 7 ? 5 : (days <= 30 ? 3 : 0),
                    pointHoverRadius: days <= 7 ? 7 : 5,
                    pointHoverBackgroundColor: brandBlue,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: brandBlue,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        titleFont: {
                            size: 13,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 14,
                            weight: '500'
                        },
                        callbacks: {
                            title: (items) => {
                                // Always calculate day + date for tooltip
                                const index = items[0].dataIndex;
                                const totalPoints = items[0].chart.data.labels.length;
                                const date = new Date();
                                date.setDate(date.getDate() - (totalPoints - 1 - index));
                                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                return `${dayNames[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${value} movement${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#6B7280',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 8,
                            maxRotation: days > 30 ? 45 : 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)',
                            drawBorder: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#6B7280',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            padding: 12,
                            stepSize: 1,
                            callback: (value) => {
                                if (Number.isInteger(value)) {
                                    return value;
                                }
                            }
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeOutQuart'
                }
            }
        });

        // Remove loading state
        chartContainer.classList.remove('loading');

    } catch (error) {
        console.error('Chart initialization error:', error);
        chartContainer.classList.remove('loading');

        // Show error message
        canvas.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error';
        errorDiv.innerHTML = `
            <span class="chart-error-icon">📊</span>
            <p>Unable to load chart data</p>
            <button onclick="location.reload()" class="btn btn-sm btn-outline">Retry</button>
        `;
        chartContainer.appendChild(errorDiv);
    }
}
