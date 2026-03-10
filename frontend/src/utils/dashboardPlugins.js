// src/utils/dashboardPlugins.js
export const percentageLabelPlugin = {
    id: 'percentageLabelPlugin',
    afterDraw(chart) {
        const { ctx, data } = chart;
        ctx.save();
        data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            const total = dataset.data.reduce((a, b) => a + b, 0);
            
            meta.data.forEach((element, index) => {
                const dataValue = dataset.data[index];
                if (dataValue > 0) {
                    const percentage = ((dataValue / total) * 100).toFixed(0) + '%';
                    const { x, y } = element.getCenterPoint();
                    
                    ctx.fillStyle = 'white'; // TEXTO BLANCO ELÉCTRICO
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(percentage, x, y);
                }
            });
        });
        ctx.restore();
    }
};