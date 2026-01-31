/**
 * SUNNY 签名墙配置文件
 * 
 * 使用方法：
 * 1. 复制此文件为 config.js
 * 2. 在 app.js 顶部添加：import CONFIG from './config.js'
 * 3. 或直接修改 app.js 中的 CONFIG 对象
 */

const SIGNATURE_WALL_CONFIG = {
    // ============ 基础配置 ============
    
    // 员工总数（必须与图片数量一致）
    totalEmployees: 300,
    
    // 员工工号范围（起始工号）
    employeeIdStart: 105001,
    
    // 拼成的文字
    text: "SUNNY",
    
    // 图片配置
    images: {
        folder: "./imgs/",           // 图片文件夹路径
        extension: ".jpg",           // 图片扩展名 (.jpg 或 .png)
        fallbackColor: 0xFFD700,     // 图片加载失败时的占位符颜色
        size: 32,                    // 头像显示尺寸（像素）
    },
    
    // ============ 连接配置 ============
    
    signatureAPI: {
        // 连接模式: "websocket" | "polling" | "mock"
        mode: "websocket",
        
        // WebSocket配置
        websocket: {
            url: "ws://localhost:3000/signatures",
            reconnect: true,              // 是否自动重连
            reconnectInterval: 3000       // 重连间隔（毫秒）
        },
        
        // HTTP轮询配置
        polling: {
            url: "http://localhost:3000/api/signatures",
            interval: 1000                // 轮询间隔（毫秒）
        },
        
        // Mock演示配置
        mock: {
            delay: 2000,                  // 签名间隔（毫秒）
            randomOrder: true             // 是否随机顺序
        }
    },
    
    // ============ 视觉配置 ============
    
    visual: {
        // 屏幕尺寸（固定）
        width: 1920,
        height: 1080,
        
        // 文字配置
        font: {
            family: "Montserrat, sans-serif",
            size: 280,
            weight: "900"
        },
        
        // 颜色主题
        colors: {
            primary: 0xFFD700,           // 主色（金色）
            highlight: 0xFFFF00,         // 签名高亮色
            signed: 0x00FF00,            // 已签名边框色
            dust: [0xFFD700, 0xFFA500, 0xFF8C00]  // 尘埃颜色
        },
        
        // 粒子效果
        particles: {
            dustCount: 1500,             // 尘埃数量
            flowSpeed: 0.06,             // 流场速度
            noiseScale: 0.004,           // 噪声缩放
            mouseAvoidDistance: 120      // 鼠标避让距离
        }
    },
    
    // ============ 动画配置 ============
    
    animation: {
        // 头像飞入（页面加载时）
        entrance: {
            duration: 1.5,               // 飞入时长（秒）
            stagger: 2.0,                // 错峰时间（秒）
            ease: "power2.out"
        },
        
        // 签名动画
        signature: {
            highlightDuration: 0.8,      // 放大高亮时长（秒）
            flyDuration: 2.0,            // 飞向目标时长（秒）
            scaleMultiplier: 1.8,        // 放大倍数
            queueDelay: 150,             // 队列处理间隔（毫秒）
            ease: "power2.inOut"
        },
        
        // 完成动画
        completion: {
            borderPulse: true,           // 边框脉冲效果
            dustConverge: true,          // 尘埃汇聚
            duration: 3.0                // 完成动画时长（秒）
        }
    },
    
    // ============ 调试配置 ============
    
    debug: {
        enabled: false,                  // 是否开启调试模式
        showFPS: false,                  // 显示帧率
        logSignatures: true,             // 记录签名日志
        skipAnimation: false             // 跳过动画（测试用）
    },
    
    // ============ 高级配置 ============
    
    advanced: {
        // 性能优化
        maxParticlesPerFrame: 10,        // 每帧最多处理的粒子数
        useWebGL: true,                  // 使用WebGL渲染
        antialiasing: true,              // 抗锯齿
        
        // 容错配置
        maxRetries: 3,                   // 图片加载最大重试次数
        loadTimeout: 10000,              // 加载超时时间（毫秒）
        
        // 状态持久化
        saveProgress: false,             // 保存签名进度到LocalStorage
        storageKey: "sunny_signatures"
    }
};

// 如果是浏览器环境，导出到全局
if (typeof window !== 'undefined') {
    window.SIGNATURE_WALL_CONFIG = SIGNATURE_WALL_CONFIG;
}

// 如果是Node.js环境，使用module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SIGNATURE_WALL_CONFIG;
}
