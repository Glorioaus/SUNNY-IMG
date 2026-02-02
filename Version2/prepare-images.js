#!/usr/bin/env node

/**
 * SUNNY 图片准备工具
 *
 * 功能：
 * 1. 批量重命名图片为工号格式
 * 2. 检查图片完整性
 * 3. 生成缺失图片占位符
 *
 * 使用方法：
 * node prepare-images.js
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// 配置
const CONFIG = {
  sourceFolder: './source-images', // 原始图片文件夹
  targetFolder: './imgs', // 目标文件夹
  employeeIdStart: 105001, // 起始工号
  totalEmployees: 300, // 员工总数
  supportedFormats: ['.jpg', '.jpeg', '.png'],
  targetFormat: '.jpg'
}

function question (query) {
  return new Promise(resolve => rl.question(query, resolve))
}

function log (message, type = 'info') {
  const colors = {
    info: '\x1b[36m', // 青色
    success: '\x1b[32m', // 绿色
    warning: '\x1b[33m', // 黄色
    error: '\x1b[31m' // 红色
  }
  const reset = '\x1b[0m'
  console.log(`${colors[type]}${message}${reset}`)
}

// 检查文件夹
function ensureFolder (folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
    log(`✓ 创建文件夹: ${folderPath}`, 'success')
  }
}

// 获取图片文件列表
function getImageFiles (folder) {
  if (!fs.existsSync(folder)) {
    return []
  }

  return fs.readdirSync(folder).filter(file => {
    const ext = path.extname(file).toLowerCase()
    return CONFIG.supportedFormats.includes(ext)
  })
}

// 模式1: 按顺序重命名
async function renameByOrder () {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info')
  log('  模式1: 按顺序重命名', 'info')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info')

  const sourceImages = getImageFiles(CONFIG.sourceFolder)

  if (sourceImages.length === 0) {
    log('源文件夹中没有找到图片！', 'error')
    log(`请将图片放入: ${CONFIG.sourceFolder}`, 'warning')
    return
  }

  log(`找到 ${sourceImages.length} 张图片`, 'info')

  if (sourceImages.length !== CONFIG.totalEmployees) {
    log(
      `警告: 图片数量(${sourceImages.length})与员工数(${CONFIG.totalEmployees})不匹配`,
      'warning'
    )
    const proceed = await question('是否继续? (y/n): ')
    if (proceed.toLowerCase() !== 'y') {
      return
    }
  }

  ensureFolder(CONFIG.targetFolder)

  let successCount = 0

  for (
    let i = 0;
    i < Math.min(sourceImages.length, CONFIG.totalEmployees);
    i++
  ) {
    const sourceFile = sourceImages[i]
    const employeeId = CONFIG.employeeIdStart + i
    const targetFile = `${employeeId}${CONFIG.targetFormat}`

    const sourcePath = path.join(CONFIG.sourceFolder, sourceFile)
    const targetPath = path.join(CONFIG.targetFolder, targetFile)

    try {
      fs.copyFileSync(sourcePath, targetPath)
      successCount++
      log(`✓ ${sourceFile} → ${targetFile}`, 'success')
    } catch (error) {
      log(`✗ 复制失败: ${sourceFile} - ${error.message}`, 'error')
    }
  }

  log(
    `\n完成！成功处理 ${successCount}/${sourceImages.length} 张图片`,
    'success'
  )
}

// 模式2: 按现有文件名匹配工号
async function renameByFilename () {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info')
  log('  模式2: 按文件名中的工号重命名', 'info')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info')

  const sourceImages = getImageFiles(CONFIG.sourceFolder)

  if (sourceImages.length === 0) {
    log('源文件夹中没有找到图片！', 'error')
    return
  }

  log(`找到 ${sourceImages.length} 张图片`, 'info')
  ensureFolder(CONFIG.targetFolder)

  let successCount = 0
  let failedFiles = []

  for (const sourceFile of sourceImages) {
    // 尝试从文件名中提取工号（6位数字）
    const match = sourceFile.match(/\d{6}/)

    if (match) {
      const employeeId = match[0]
      const targetFile = `${employeeId}${CONFIG.targetFormat}`
      const sourcePath = path.join(CONFIG.sourceFolder, sourceFile)
      const targetPath = path.join(CONFIG.targetFolder, targetFile)

      try {
        fs.copyFileSync(sourcePath, targetPath)
        successCount++
        log(`✓ ${sourceFile} → ${targetFile}`, 'success')
      } catch (error) {
        log(`✗ 复制失败: ${sourceFile}`, 'error')
        failedFiles.push(sourceFile)
      }
    } else {
      log(`⚠ 跳过（无法识别工号）: ${sourceFile}`, 'warning')
      failedFiles.push(sourceFile)
    }
  }

  log(
    `\n完成！成功处理 ${successCount}/${sourceImages.length} 张图片`,
    'success'
  )

  if (failedFiles.length > 0) {
    log(`\n未处理的文件 (${failedFiles.length}):`, 'warning')
    failedFiles.forEach(file => log(`  - ${file}`, 'warning'))
  }
}

// 模式3: 检查并生成缺失图片
async function checkAndFillMissing () {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info')
  log('  模式3: 检查图片完整性', 'info')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info')

  ensureFolder(CONFIG.targetFolder)

  const existingFiles = new Set(
    fs
      .readdirSync(CONFIG.targetFolder)
      .filter(f => f.endsWith(CONFIG.targetFormat))
      .map(f => path.basename(f, CONFIG.targetFormat))
  )

  const missingIds = []

  for (let i = 0; i < CONFIG.totalEmployees; i++) {
    const employeeId = `${CONFIG.employeeIdStart + i}`
    if (!existingFiles.has(employeeId)) {
      missingIds.push(employeeId)
    }
  }

  log(`已存在: ${existingFiles.size}/${CONFIG.totalEmployees}`, 'info')
  log(
    `缺失: ${missingIds.length}/${CONFIG.totalEmployees}`,
    missingIds.length > 0 ? 'warning' : 'success'
  )

  if (missingIds.length > 0) {
    log('\n缺失的工号:', 'warning')
    missingIds.forEach(id => log(`  - ${id}`, 'warning'))

    const generate = await question('\n是否生成占位符图片? (y/n): ')

    if (generate.toLowerCase() === 'y') {
      log('\n提示: 需要安装 sharp 库来生成占位符', 'info')
      log('运行: npm install sharp\n', 'info')

      try {
        const sharp = require('sharp')

        for (const employeeId of missingIds) {
          const targetPath = path.join(
            CONFIG.targetFolder,
            `${employeeId}${CONFIG.targetFormat}`
          )

          // 生成简单的占位符图片
          await sharp({
            create: {
              width: 200,
              height: 200,
              channels: 3,
              background: { r: 255, g: 215, b: 0 }
            }
          })
            .jpeg()
            .toFile(targetPath)

          log(`✓ 生成占位符: ${employeeId}`, 'success')
        }

        log(`\n完成！生成了 ${missingIds.length} 个占位符`, 'success')
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          log('未安装 sharp，无法生成占位符图片', 'error')
          log('手动安装: npm install sharp', 'warning')
        } else {
          log(`生成失败: ${error.message}`, 'error')
        }
      }
    }
  } else {
    log('\n✓ 所有图片齐全！', 'success')
  }
}

// 模式4: 批量调整图片尺寸
async function resizeImages () {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info')
  log('  模式4: 批量调整图片尺寸', 'info')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'info')

  const targetSize = await question('目标尺寸（像素，如 200）: ')
  const size = parseInt(targetSize)

  if (isNaN(size) || size < 50) {
    log('无效的尺寸', 'error')
    return
  }

  const images = getImageFiles(CONFIG.targetFolder)

  if (images.length === 0) {
    log('目标文件夹中没有图片', 'error')
    return
  }

  try {
    const sharp = require('sharp')

    log(`开始处理 ${images.length} 张图片...`, 'info')

    for (const file of images) {
      const filePath = path.join(CONFIG.targetFolder, file)
      const tempPath = filePath + '.tmp'

      try {
        await sharp(filePath)
          .resize(size, size, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toFile(tempPath)

        fs.unlinkSync(filePath)
        fs.renameSync(tempPath, filePath)

        log(`✓ ${file}`, 'success')
      } catch (error) {
        log(`✗ ${file}: ${error.message}`, 'error')
      }
    }

    log(`\n完成！处理了 ${images.length} 张图片`, 'success')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log('未安装 sharp，无法调整尺寸', 'error')
      log('手动安装: npm install sharp', 'warning')
    } else {
      log(`处理失败: ${error.message}`, 'error')
    }
  }
}

// 主菜单
async function main () {
  console.clear()
  log('╔════════════════════════════════════════════╗', 'info')
  log('║      SUNNY 图片准备工具 v1.0              ║', 'info')
  log('╚════════════════════════════════════════════╝', 'info')

  while (true) {
    log('\n请选择操作:', 'info')
    log('  1. 按顺序重命名图片', 'info')
    log('  2. 按文件名中的工号重命名', 'info')
    log('  3. 检查图片完整性', 'info')
    log('  4. 批量调整图片尺寸', 'info')
    log('  5. 退出\n', 'info')

    const choice = await question('请输入选项 (1-5): ')

    switch (choice.trim()) {
      case '1':
        await renameByOrder()
        break
      case '2':
        await renameByFilename()
        break
      case '3':
        await checkAndFillMissing()
        break
      case '4':
        await resizeImages()
        break
      case '5':
        log('\n再见！', 'success')
        rl.close()
        return
      default:
        log('无效的选项', 'error')
    }

    await question('\n按回车继续...')
  }
}

// 启动
main().catch(error => {
  log(`发生错误: ${error.message}`, 'error')
  rl.close()
})
