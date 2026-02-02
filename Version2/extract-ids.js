const fs = require('fs')
const path = require('path')

// 图片目录路径
const imgDir = path.join(__dirname, 'imgs')

// 支持的图片扩展名
const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

try {
  // 读取目录中的所有文件
  const files = fs.readdirSync(imgDir)

  // 提取工号（文件名不含扩展名）
  const employeeIds = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase()
      return validExtensions.includes(ext)
    })
    .map(file => path.parse(file).name)
    .sort() // 按工号排序

  console.log('=== 提取到的工号列表 ===')
  console.log(`总数: ${employeeIds.length}个`)
  console.log('------------------------')
  employeeIds.forEach((id, index) => {
    console.log(`${index + 1}. ${id}`)
  })

  // 保存到JSON文件
  const outputFile = path.join(__dirname, 'employee-ids.json')
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        employees: employeeIds,
        total: employeeIds.length,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  )

  console.log('------------------------')
  console.log(`工号列表已保存到: ${outputFile}`)
} catch (error) {
  console.error('提取工号失败:', error.message)
  process.exit(1)
}
