/**
 * SUNNY 签名墙后端服务器
 * 支持WebSocket和HTTP轮询两种方式
 *
 * 安装依赖:
 * npm install express ws cors
 *
 * 运行:
 * node server.js
 */

const express = require('express')
const WebSocket = require('ws')
const cors = require('cors')
const http = require('http')

const path = require('path')
const fs = require('fs')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server, path: '/signatures' })

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.static(__dirname)) // 托管当前目录下的静态文件

app.get('/logo.png', (req, res) => {
  const logoPath = path.join(__dirname, '..', 'logo.png')
  if (!fs.existsSync(logoPath)) {
    return res.status(404).end()
  }
  return res.sendFile(logoPath)
})

// 签名数据存储
const signatures = []
let signatureIdCounter = 1

// WebSocket连接处理
wss.on('connection', ws => {
  console.log('[WebSocket] 新连接建立')

  ws.on('message', message => {
    try {
      const data = JSON.parse(message)
      console.log('[WebSocket] 收到消息:', data)

      // 处理各种消息类型
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    } catch (error) {
      console.error('[WebSocket] 消息解析错误:', error)
    }
  })

  ws.on('close', () => {
    console.log('[WebSocket] 连接关闭')
  })

  ws.on('error', error => {
    console.error('[WebSocket] 错误:', error)
  })
})

// 广播签名事件到所有WebSocket客户端
function broadcastSignature (employeeId, timestamp) {
  const message = JSON.stringify({
    employeeId,
    timestamp: timestamp || Date.now()
  })

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })

  console.log(`[Broadcast] 签名事件已广播: ${employeeId}`)
}

/**
 * API端点
 */

// 接收签名（供外部系统调用）
app.post('/api/signature', (req, res) => {
  const { employeeId } = req.body

  if (!employeeId) {
    return res.status(400).json({ error: '缺少employeeId' })
  }

  // 检查是否已存在
  const exists = signatures.find(s => s.employeeId === employeeId)
  if (exists) {
    return res.status(409).json({ error: '该员工已签名' })
  }

  const signature = {
    id: signatureIdCounter++,
    employeeId,
    timestamp: Date.now()
  }

  signatures.push(signature)

  // 广播到所有WebSocket客户端
  broadcastSignature(employeeId, signature.timestamp)

  res.json({
    success: true,
    signature
  })

  console.log(`[API] 新签名: ${employeeId}`)
})

// 批量接收签名
app.post('/api/signatures/batch', (req, res) => {
  const { employeeIds } = req.body

  if (!Array.isArray(employeeIds)) {
    return res.status(400).json({ error: 'employeeIds必须是数组' })
  }

  const newSignatures = []

  employeeIds.forEach(employeeId => {
    const exists = signatures.find(s => s.employeeId === employeeId)
    if (!exists) {
      const signature = {
        id: signatureIdCounter++,
        employeeId,
        timestamp: Date.now()
      }
      signatures.push(signature)
      newSignatures.push(signature)

      // 广播
      broadcastSignature(employeeId, signature.timestamp)
    }
  })

  res.json({
    success: true,
    count: newSignatures.length,
    signatures: newSignatures
  })

  console.log(`[API] 批量签名: ${newSignatures.length}个`)
})

// 轮询接口：获取新签名
app.get('/api/signatures', (req, res) => {
  const since = parseInt(req.query.since) || 0

  const newSignatures = signatures.filter(s => s.id > since)

  res.json({
    signatures: newSignatures,
    total: signatures.length
  })
})

// 获取所有签名
app.get('/api/signatures/all', (req, res) => {
  res.json({
    signatures,
    total: signatures.length
  })
})

// 重置所有签名（用于测试）
app.post('/api/signatures/reset', (req, res) => {
  signatures.length = 0
  signatureIdCounter = 1

  // 广播重置消息
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'reset' }))
    }
  })

  res.json({ success: true, message: '已重置所有签名' })
  console.log(`[API] 签名数据已重置`)
})

// 强制归位指令（大会结束时调用）
app.post('/api/control/converge', (req, res) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'converge' }))
    }
  })
  console.log('[Control] 发送强制归位指令')
  res.json({ success: true, message: '已发送归位指令' })
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    signatures: signatures.length,
    connections: wss.clients.size
  })
})

/**
 * 测试工具：模拟随机签名
 */
let mockInterval = null
const enableMock = process.env.SUNNY_ENABLE_MOCK === '1' || process.env.NODE_ENV !== 'production'

if (enableMock) {
app.post('/api/test/start-mock', (req, res) => {
  if (mockInterval) {
    return res.json({ message: '模拟已在运行中' })
  }

  const imgDir = path.join(__dirname, 'imgs')
  let employeeIds = []
  try {
    if (fs.existsSync(imgDir)) {
      const files = fs.readdirSync(imgDir)
      employeeIds = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase()
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
        })
        .map(file => path.parse(file).name)
    }
  } catch (error) {
    console.error('[Mock] 读取图片目录失败:', error)
  }

  if (employeeIds.length === 0) {
    employeeIds = Array.from({ length: 300 }, (_, i) => `${105001 + i}`)
  }

  // 随机打乱
  for (let i = employeeIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[employeeIds[i], employeeIds[j]] = [employeeIds[j], employeeIds[i]]
  }

  let index = 0
  mockInterval = setInterval(() => {
    if (index >= employeeIds.length) {
      clearInterval(mockInterval)
      mockInterval = null
      console.log('[Mock] 所有签名完成')
      return
    }

    const employeeId = employeeIds[index]
    const signature = {
      id: signatureIdCounter++,
      employeeId,
      timestamp: Date.now()
    }
    signatures.push(signature)
    broadcastSignature(employeeId, signature.timestamp)

    index++
  }, 2000) // 每2秒一个签名

  res.json({
    success: true,
    message: '模拟签名已启动',
    totalEmployees: employeeIds.length
  })

  console.log('[Mock] 开始模拟签名')
})

app.post('/api/test/stop-mock', (req, res) => {
  if (mockInterval) {
    clearInterval(mockInterval)
    mockInterval = null
    res.json({ success: true, message: '模拟签名已停止' })
    console.log('[Mock] 停止模拟签名')
  } else {
    res.json({ message: '没有正在运行的模拟' })
  }
})
} else {
  app.post('/api/test/start-mock', (req, res) => res.status(404).json({ error: 'mock disabled' }))
  app.post('/api/test/stop-mock', (req, res) => res.status(404).json({ error: 'mock disabled' }))
}

// ... (existing code)

// 获取所有员工列表（基于图片文件）
app.get('/api/employees', (req, res) => {
  const imgDir = path.join(__dirname, 'imgs')
  
  // 检查目录是否存在
  if (!fs.existsSync(imgDir)) {
    return res.status(404).json({ employees: [], count: 0, error: 'imgs directory not found' })
  }

  try {
    const files = fs.readdirSync(imgDir)
    const employees = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
      })
      .map(file => path.parse(file).name) // 移除扩展名作为工号

    res.json({
      employees,
      count: employees.length
    })
    console.log(`[API] 返回员工列表: ${employees.length}人`)
  } catch (error) {
    console.error('[API] 读取图片目录失败:', error)
    res.status(500).json({ error: 'Failed to read images directory' })
  }
})

// 启动服务器
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   SUNNY 签名墙服务器已启动                  ║
║   端口: ${PORT}                              ║
╚════════════════════════════════════════════╝

API端点:
  POST /api/signature          - 接收单个签名
  POST /api/signatures/batch   - 批量接收签名
  GET  /api/signatures         - 轮询获取签名
  GET  /api/signatures/all     - 获取所有签名
  POST /api/signatures/reset   - 重置签名

  POST /api/test/start-mock    - 启动模拟签名
  POST /api/test/stop-mock     - 停止模拟签名

WebSocket:
  ws://localhost:${PORT}/signatures

示例调用:
  curl -X POST http://localhost:${PORT}/api/signature \\
    -H "Content-Type: application/json" \\
    -d '{"employeeId": "105001"}'

  curl -X POST http://localhost:${PORT}/api/test/start-mock
    `)
})
