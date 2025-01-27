const express = require('express');
const app = express();
const path = require('path');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 换一个端口，比如8080
const port = 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`服务器运行在: http://localhost:${port}`);
    // 显示局域网IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // 跳过内部IP和非IPv4地址
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`局域网访问地址: http://${net.address}:${port}`);
            }
        }
    }
});