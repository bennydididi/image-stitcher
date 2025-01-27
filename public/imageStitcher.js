class ImageStitcher {
    // 查找最佳匹配
    static async findBestMatch(data1, data2) {
        console.log('开始查找重叠区域');
        console.log(`图片1: ${data1.width}x${data1.height}, 图片2: ${data2.width}x${data2.height}`);

        // 搜索范围优化：第一张图片下半部分，第二张图片上半部分
        const startRow1 = Math.floor(data1.height * 0.5);  // 第一张图片从50%开始
        const endRow1 = data1.height - 50;                 // 留出一点边界
        const startRow2 = 50;                              // 跳过顶部一点边界
        const endRow2 = Math.floor(data2.height * 0.5);    // 第二张图片搜索到50%

        let bestMatch = null;
        let maxMatchingRows = 0;
        let totalRows = 0;
        let processedRows = 0;

        // 使用 Uint32Array 加速像素访问
        const view1 = new Uint32Array(data1.data.buffer);
        const view2 = new Uint32Array(data2.data.buffer);
        const width = data1.width;

        // 计算总行数用于进度显示
        totalRows = (endRow1 - startRow1) * (endRow2 - startRow2);

        // 逐行搜索
        for (let row1 = startRow1; row1 < endRow1; row1++) {
            // 每20行更新一次进度
            if (row1 % 20 === 0) {
                const progress = ((row1 - startRow1) / (endRow1 - startRow1) * 100).toFixed(1);
                console.log(`搜索进度: ${progress}%`);
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // 检查第一张图片当前行是否是有效行（非纯白）
            if (!this.isValidRow(view1, row1, width)) {
                continue;
            }

            for (let row2 = startRow2; row2 < endRow2; row2++) {
                processedRows++;

                // 检查第二张图片当前行是否是有效行
                if (!this.isValidRow(view2, row2, width)) {
                    continue;
                }

                // 检查连续匹配的行数
                const matchingRows = this.checkConsecutiveMatches(view1, view2, row1, row2, width);
                if (matchingRows > maxMatchingRows) {
                    maxMatchingRows = matchingRows;
                    bestMatch = {
                        row1: row1,
                        row2: row2,
                        matchingHeight: matchingRows
                    };

                    console.log(`找到更好的匹配: 从图1的第${row1}行到图2的第${row2}行, 连续匹配${matchingRows}行`);

                    // 如果找到足够好的匹配就提前返回
                    if (matchingRows >= 100) {
                        console.log('找到足够好的匹配，提前结束搜索');
                        return bestMatch;
                    }
                }
            }
        }

        console.log(`搜索完成，最大连续匹配行数: ${maxMatchingRows}`);
        return maxMatchingRows >= 50 ? bestMatch : null;
    }

    // 检查是否是有效行（非纯白）
    static isValidRow(view, row, width) {
        let whiteCount = 0;
        const rowOffset = row * width;

        // 采样检查，每10个像素检查一个
        for (let x = 0; x < width; x += 10) {
            const pixel = view[rowOffset + x];
            if (this.isWhitePixel(pixel)) {
                whiteCount++;
            }
        }

        // 如果采样点中90%以上是白色，认为是无效行
        return whiteCount < (width / 10 * 0.9);
    }

    // 检查连续匹配的行数
    static checkConsecutiveMatches(view1, view2, startRow1, startRow2, width) {
        let consecutiveMatches = 0;
        const maxCheck = 200; // 最多检查200行

        for (let i = 0; i < maxCheck; i++) {
            const row1 = startRow1 + i;
            const row2 = startRow2 + i;

            if (this.compareRows(view1, view2, row1, row2, width)) {
                consecutiveMatches++;
            } else {
                break;
            }
        }

        return consecutiveMatches;
    }

    // 比较两行是否匹配
    static compareRows(view1, view2, row1, row2, width) {
        let matches = 0;
        const rowOffset1 = row1 * width;
        const rowOffset2 = row2 * width;

        // 采样比较，每5个像素比较一个
        for (let x = 0; x < width; x += 5) {
            const pixel1 = view1[rowOffset1 + x];
            const pixel2 = view2[rowOffset2 + x];

            if (this.pixelsSimilar(pixel1, pixel2)) {
                matches++;
            }
        }

        // 要求95%以上的采样点匹配
        return matches >= (width / 5 * 0.95);
    }

    // 检查像素是否是白色
    static isWhitePixel(pixel) {
        const r = pixel & 0xFF;
        const g = (pixel >> 8) & 0xFF;
        const b = (pixel >> 16) & 0xFF;
        return r >= 250 && g >= 250 && b >= 250;
    }

    // 比较两个像素是否相似
    static pixelsSimilar(pixel1, pixel2) {
        const r1 = pixel1 & 0xFF;
        const g1 = (pixel1 >> 8) & 0xFF;
        const b1 = (pixel1 >> 16) & 0xFF;
        const r2 = pixel2 & 0xFF;
        const g2 = (pixel2 >> 8) & 0xFF;
        const b2 = (pixel2 >> 16) & 0xFF;

        const threshold = 5;
        return Math.abs(r1 - r2) <= threshold &&
            Math.abs(g1 - g2) <= threshold &&
            Math.abs(b1 - b2) <= threshold;
    }

    // 标记重叠区域
    static markOverlappingArea(canvas1, canvas2, result, startY1) {
        const ctx1 = canvas1.getContext('2d');
        const ctx2 = canvas2.getContext('2d');

        ctx1.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx2.fillStyle = 'rgba(0, 255, 0, 0.3)';

        ctx1.fillRect(0, startY1 + result.row1, canvas1.width, result.matchingHeight);
        ctx2.fillRect(0, result.row2, canvas2.width, result.matchingHeight);
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageStitcher;
} else {
    window.ImageStitcher = ImageStitcher;
} 