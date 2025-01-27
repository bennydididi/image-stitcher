class ImageMerger {
    // 合并图片
    static mergeImages(canvases, results) {
        console.log('开始合并图片...');
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const width = canvases[0].width;

        // 创建临时画布
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;

        // 第一遍：计算总高度
        let totalHeight = 0;
        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const nextResult = results[i];
            const prevResult = results[i - 1];

            if (i === 0) {
                // 第一张图：保留到重叠区域结束
                if (nextResult && nextResult.success) {
                    totalHeight += nextResult.startY1 + nextResult.row1;
                } else {
                    totalHeight += canvas.height;
                }
            } else if (i === canvases.length - 1) {
                // 最后一张图：从上一轮重叠结束到结尾
                if (prevResult && prevResult.success) {
                    totalHeight += canvas.height - prevResult.row2;
                } else {
                    totalHeight += canvas.height;
                }
            } else {
                // 中间图：从上一轮重叠结束到当前重叠结束
                if (prevResult && prevResult.success) {
                    const startY = prevResult.row2;
                    if (nextResult && nextResult.success) {
                        totalHeight += (nextResult.startY1 + nextResult.row1) - startY;
                    } else {
                        totalHeight += canvas.height - startY;
                    }
                } else {
                    totalHeight += canvas.height;
                }
            }
        }

        // 设置画布尺寸
        finalCanvas.width = width;
        finalCanvas.height = totalHeight;

        // 第二遍：实际绘制
        let currentY = 0;
        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const nextResult = results[i];
            const prevResult = results[i - 1];

            tempCanvas.height = canvas.height;
            tempCtx.drawImage(canvas, 0, 0);

            if (i === 0) {
                // 第一张图：保留到重叠区域结束
                if (nextResult && nextResult.success) {
                    const height = nextResult.startY1 + nextResult.row1;
                    ctx.drawImage(tempCanvas, 0, 0, width, height, 0, currentY, width, height);
                    currentY += height;
                } else {
                    ctx.drawImage(tempCanvas, 0, currentY);
                    currentY += canvas.height;
                }
            } else if (i === canvases.length - 1) {
                // 最后一张图：从上一轮重叠结束到结尾
                if (prevResult && prevResult.success) {
                    const startY = prevResult.row2;
                    const height = canvas.height - startY;
                    ctx.drawImage(tempCanvas, 0, startY, width, height, 0, currentY, width, height);
                    currentY += height;
                } else {
                    ctx.drawImage(tempCanvas, 0, currentY);
                    currentY += canvas.height;
                }
            } else {
                // 中间图：从上一轮重叠结束到当前重叠结束
                if (prevResult && prevResult.success) {
                    const startY = prevResult.row2;
                    if (nextResult && nextResult.success) {
                        const height = (nextResult.startY1 + nextResult.row1) - startY;
                        ctx.drawImage(tempCanvas, 0, startY, width, height, 0, currentY, width, height);
                        currentY += height;
                    } else {
                        const height = canvas.height - startY;
                        ctx.drawImage(tempCanvas, 0, startY, width, height, 0, currentY, width, height);
                        currentY += height;
                    }
                } else {
                    ctx.drawImage(tempCanvas, 0, currentY);
                    currentY += canvas.height;
                }
            }
        }

        return finalCanvas;
    }

    // 创建结果显示
    static createMergeResult(finalCanvas) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'merge-result';

        // 将画布转换为图片
        const img = document.createElement('img');
        img.src = finalCanvas.toDataURL('image/png');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';

        resultDiv.appendChild(img);
        return resultDiv;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageMerger;
} else {
    window.ImageMerger = ImageMerger;
} 