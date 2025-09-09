document.addEventListener('DOMContentLoaded', () => {
    // Paleta MetaMapa
    const C = {
        brand800: '#3B4F61',
        brand500: '#86A8C2',
        accent: '#AFCBE3',
        green: '#6FCF97',
        red: '#EB5757',
        softBlue: '#EAF3FA',
        softGreen: '#E1F2EA'
    };

    // Tipografía global coherente con el sitio
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = C.brand800;

    // Opciones base para barras/líneas
    const baseXY = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {legend: {display: false}},
        scales: {
            x: {grid: {display: false}},
            y: {
                beginAtZero: true,
                grid: {color: 'rgba(59,79,97,.08)'},
                ticks: {precision: 0}
            }
        }
    };

    // === 1) Barras: Hechos por provincia (colección) ===
    new Chart(document.getElementById('chartProvColeccion'), {
        type: 'bar',
        data: {
            labels: ['Buenos Aires', 'Santa Fe', 'Córdoba', 'Mendoza', 'Neuquén'],
            datasets: [{
                label: 'Hechos',
                data: [120, 95, 80, 55, 40],
                backgroundColor: C.brand500,
                borderRadius: 8
            }]
        },
        options: baseXY
    });

    // === 2) Barras horizontales: Hechos por categoría ===
    new Chart(document.getElementById('chartCategorias'), {
        type: 'bar',
        data: {
            labels: ['Defensa civil', 'Contaminación', 'Derrame', 'Incendio', 'Otros'],
            datasets: [{
                data: [250, 180, 140, 90, 60],
                backgroundColor: [C.brand500, C.accent, '#C9DEEC', '#B7CFE2', '#9FBBD2'],
                borderRadius: 8
            }]
        },
        options: {
            ...baseXY,
            indexAxis: 'y'
        }
    });

    // === 3) Doughnut: Porcentaje de spam ===
    new Chart(document.getElementById('chartSpam'), {
        type: 'doughnut',
        data: {
            labels: ['Spam', 'Válidas'],
            datasets: [{
                data: [90, 10],
                backgroundColor: [C.red, C.softGreen],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {position: 'bottom'},
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.raw}%`
                    }
                }
            }
        }
    });
});

