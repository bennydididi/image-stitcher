class ImageProcessor {
    constructor() {
        this.setupUI();
        this.images = [];
        this.canvases = [];
        this.originalCanvases = [];
        this.results = [];
        this.isShowingOriginal = false;  // 添加标志位
    }

    setupUI() {
        this.imageInput = document.getElementById('imageInput');
        this.processBtn = document.getElementById('processBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.statusEl = document.getElementById('status');
        this.imageContainer = document.getElementById('imageContainer');
        this.resultsContainer = document.getElementById('resultsContainer');

        this.imageInput.addEventListener('change', (e) => this.handleImagesUpload(e));
        this.processBtn.addEventListener('click', () => this.processImages());
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // 修改 Sortable 配置
        this.sortable = Sortable.create(this.imageContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            handle: '.canvas-inner',
            draggable: '.canvas-wrapper',
            onSort: () => {
                this.updateCanvasOrder();
            }
        });

        // 添加 Shift+D 快捷键监听
        document.addEventListener('keydown', (e) => {
            if (e.key === 'D' && e.shiftKey) {  // 检查是否同时按下 Shift 和 D
                e.preventDefault();  // 阻止默认行为
                this.toggleOriginalView();
            }
        });

        // 初始状态：只隐藏拼接按钮和清除按钮
        this.processBtn.style.display = 'none';  // 隐藏拼接按钮
        this.clearBtn.style.display = 'none';    // 隐藏清除按钮
        this.statusEl.textContent = '等待上传图片';
    }

    clearAll() {
        this.images = [];
        this.canvases = [];
        this.originalCanvases = [];
        this.imageContainer.innerHTML = '';
        this.imageContainer.style.display = 'flex';
        this.processBtn.style.display = 'none';  // 隐藏拼接按钮
        this.clearBtn.style.display = 'none';    // 隐藏清除按钮
        this.statusEl.textContent = '状态：等待上传图片';
        this.results = [];
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'none';  // 隐藏结果容器
        this.isShowingOriginal = false;  // 重置标志位
    }

    handleImagesUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // 如果当前显示的是"重新拼接"按钮，先清空所有内容
        const fileInputLabel = document.querySelector('.file-input-label');
        if (fileInputLabel && fileInputLabel.textContent === '重新拼接') {
            this.clearAll();
            // 恢复按钮文本
            fileInputLabel.textContent = '添加图片';
            return;  // 返回，等待用户重新选择文件
        }

        // 清除现有数据
        this.images = [];
        this.canvases = [];
        this.imageContainer.innerHTML = '';

        // 显示上传状态
        this.statusEl.textContent = '正在上传图片...';

        Promise.all(files.map(file => this.loadImage(file)))
            .then(() => {
                this.statusEl.textContent = `已添加 ${files.length} 张图片`;
                // 显示拼接按钮和清除按钮
                this.processBtn.style.display = 'block';
                this.clearBtn.style.display = 'block';  // 只在有图片时显示清除按钮
            })
            .catch(error => {
                console.error('Error loading images:', error);
                this.statusEl.textContent = '上传图片失败';
            });
    }

    loadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    img.fileName = file.name;
                    this.images.push(img);
                    const canvas = this.createCanvas(this.images.length - 1, file.name);
                    this.drawImage(img, canvas);
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    createCanvas(index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-wrapper';
        wrapper.setAttribute('data-index', index);

        const inner = document.createElement('div');
        inner.className = 'canvas-inner';

        const canvas = document.createElement('canvas');
        inner.appendChild(canvas);
        wrapper.appendChild(inner);
        this.imageContainer.appendChild(wrapper);

        this.canvases.push(canvas);
        return canvas;
    }

    drawImage(img, canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 保存原始画布
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = img.width;
        originalCanvas.height = img.height;
        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0);
        this.originalCanvases.push(originalCanvas);
    }

    updateStatus() {
        if (this.images.length > 0) {
            this.processBtn.disabled = false;
            this.statusEl.textContent = '状态：图片已上传，可以开始处理';
        }
    }

    async processImages() {
        console.log('开始处理图片');
        if (this.images.length < 2) {
            console.log('图片数量不足');
            this.statusEl.textContent = '至少需要2张图片';
            return;
        }

        this.resultsContainer.innerHTML = '';
        const wrappers = Array.from(this.imageContainer.querySelectorAll('.canvas-wrapper'));
        console.log(`找到 ${wrappers.length} 个图片包装器`);
        const totalPairs = wrappers.length - 1;

        // 逐对处理图片
        for (let i = 0; i < wrappers.length - 1; i++) {
            const progress = ((i + 1) / totalPairs * 100).toFixed(1);
            console.log(`总体进度: ${progress}% (${i + 1}/${totalPairs}对)`);
            console.log(`处理第 ${i + 1} 和第 ${i + 2} 张图片`);
            await this.processImagePair(i, wrappers);
        }

        console.log('所有图片处理完成');
        this.displaySummary();

        // 合并图片时使用原始画布
        const finalCanvas = ImageMerger.mergeImages(this.originalCanvases, this.results);
        const resultDiv = ImageMerger.createMergeResult(finalCanvas);

        // 清空并显示结果容器
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'block';  // 确保结果容器可见
        this.resultsContainer.appendChild(resultDiv);

        // 隐藏原图区域和拼接按钮
        this.imageContainer.style.display = 'none';
        this.processBtn.style.display = 'none';
        this.clearBtn.style.display = 'none';

        // 修改状态文本
        this.statusEl.textContent = '拼接完成，长按图片保存到相册';

        // 将"添加图片"按钮文本改为"重新拼接"
        const fileInputLabel = document.querySelector('.file-input-label');
        if (fileInputLabel) {
            fileInputLabel.textContent = '重新拼接';
        }
    }

    async processImagePair(i, wrappers) {
        try {
            const visualIndex1 = i + 1;
            const visualIndex2 = i + 2;

            console.log(`开始分析第 ${visualIndex1} 和第 ${visualIndex2} 张图片的重叠区域`);
            this.statusEl.textContent = `正在拼接第 ${visualIndex1} 和第 ${visualIndex2} 张图片...`;

            const canvas1 = this.canvases[parseInt(wrappers[i].getAttribute('data-index'))];
            const canvas2 = this.canvases[parseInt(wrappers[i + 1].getAttribute('data-index'))];

            // 创建临时画布来标记重叠区域
            const tempCanvas1 = document.createElement('canvas');
            const tempCanvas2 = document.createElement('canvas');
            tempCanvas1.width = canvas1.width;
            tempCanvas1.height = canvas1.height;
            tempCanvas2.width = canvas2.width;
            tempCanvas2.height = canvas2.height;

            // 复制原始图片到临时画布
            const tempCtx1 = tempCanvas1.getContext('2d');
            const tempCtx2 = tempCanvas2.getContext('2d');
            tempCtx1.drawImage(canvas1, 0, 0);
            tempCtx2.drawImage(canvas2, 0, 0);

            const ctx1 = canvas1.getContext('2d', { willReadFrequently: true });
            const ctx2 = canvas2.getContext('2d', { willReadFrequently: true });

            const startY1 = Math.floor(canvas1.height * 0.3);
            const data1 = ctx1.getImageData(0, startY1, canvas1.width, canvas1.height - startY1);
            const data2 = ctx2.getImageData(0, 0, canvas2.width, Math.floor(canvas2.height * 0.7));

            console.log('开始查找最佳匹配...');
            const result = await ImageStitcher.findBestMatch(data1, data2);
            console.log('匹配结果:', result);

            const resultItem = {
                pair: [visualIndex1, visualIndex2],
                success: !!result,
                matchingHeight: result ? result.matchingHeight : 0,
                row1: result ? result.row1 : 0,
                row2: result ? result.row2 : 0,
                startY1: startY1
            };

            this.results.push(resultItem);
            this.displayResult(resultItem);

            if (result) {
                console.log('标记重叠区域');
                // 在临时画布上标记重叠区域
                ImageStitcher.markOverlappingArea(
                    tempCanvas1,
                    tempCanvas2,
                    result,
                    startY1
                );

                // 显示带标记的临时画布
                const wrapper1 = wrappers[i];
                const wrapper2 = wrappers[i + 1];
                const displayCanvas1 = wrapper1.querySelector('canvas');
                const displayCanvas2 = wrapper2.querySelector('canvas');
                const displayCtx1 = displayCanvas1.getContext('2d');
                const displayCtx2 = displayCanvas2.getContext('2d');
                displayCtx1.drawImage(tempCanvas1, 0, 0);
                displayCtx2.drawImage(tempCanvas2, 0, 0);
            }
        } catch (error) {
            console.error('处理图片对时出错:', error);
        }
    }

    displayResult(result) {
        const div = document.createElement('div');
        div.className = `result-item ${result.success ? 'success' : 'failure'}`;

        // 使用位置描述而不是文件名
        const position1 = this.getPositionText(result.pair[0]);
        const position2 = this.getPositionText(result.pair[1]);

        if (result.success) {
            div.textContent = `${position1}和${position2}拼接成功，重叠高度：${result.matchingHeight}像素`;
        } else {
            div.textContent = `${position1}和${position2}未找到匹配区域`;
        }

        this.resultsContainer.appendChild(div);
    }

    // 添加新方法：将数字转换为位置描述
    getPositionText(number) {
        const positions = ['第一张', '第二张', '第三张', '第四张', '第五张',
            '第六张', '第七张', '第八张', '第九张', '第十张'];
        return positions[number - 1] || `第${number}张`;
    }

    displaySummary() {
        const successCount = this.results.filter(r => r.success).length;
        const totalCount = this.results.length;

        const summary = document.createElement('div');
        summary.className = 'result-item';
        summary.style.fontWeight = 'bold';
        summary.textContent = `分析完成：共 ${totalCount} 组图片，${successCount} 组成功匹配，${totalCount - successCount} 组未匹配`;

        this.resultsContainer.insertBefore(summary, this.resultsContainer.firstChild);
        this.statusEl.textContent = '状态：所有图片处理完成';
    }

    updateCanvasOrder() {
        const wrappers = Array.from(this.imageContainer.querySelectorAll('.canvas-wrapper'));
        const newOrder = wrappers.map(wrapper => parseInt(wrapper.getAttribute('data-index')));

        // 更新所有数组顺序
        const newImages = newOrder.map(i => this.images[i]);
        const newCanvases = newOrder.map(i => this.canvases[i]);
        const newOriginalCanvases = newOrder.map(i => this.originalCanvases[i]);

        this.images = newImages;
        this.canvases = newCanvases;
        this.originalCanvases = newOriginalCanvases;

        // 更新索引
        wrappers.forEach((wrapper, index) => {
            wrapper.setAttribute('data-index', index);
        });
    }

    // 添加切换视图的方法
    toggleOriginalView() {
        // 只在拼接完成后才能切换视图
        if (!this.resultsContainer.querySelector('canvas')) return;

        this.isShowingOriginal = !this.isShowingOriginal;

        if (this.isShowingOriginal) {
            // 显示原图
            this.imageContainer.style.display = 'flex';
            this.resultsContainer.style.display = 'none';
            this.statusEl.textContent = '调试模式：显示原图（按Shift+D切换）';
        } else {
            // 显示结果
            this.imageContainer.style.display = 'none';
            this.resultsContainer.style.display = 'block';
            this.statusEl.textContent = '拼接完成';
        }
    }
}

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    window.processor = new ImageProcessor();
}); 