#!/usr/bin/env node

/**
 * SUNNY 签名墙管理工具 (Manage Tool)
 *
 * 功能整合：
 * 1. 提取工号 (Extract IDs) -> 生成 employee-ids.json
 * 2. 图片处理 (Image Processing) -> 重命名、缩放、占位图
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CONFIG = {
  sourceFolder: './source-images',
  targetFolder: './imgs',
  outputJson: './employee-ids.json',
  employeeIdStart: 105001,
  totalEmployees: 300,
  supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  targetFormat: '.jpg'
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m', success: '\x1b[32m', warning: '\x1b[33m', error: '\x1b[31m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type] || ''}${message}${reset}`);
}

/**
 * 功能 1: 提取工号列表并同步 JSON
 */
async function syncEmployeeIds() {
  log('--- 正在同步工号列表 ---', 'info');
  const imgDir = path.resolve(__dirname, CONFIG.targetFolder);

  if (!fs.existsSync(imgDir)) {
    log(`错误: 目录 ${CONFIG.targetFolder} 不存在`, 'error');
    return;
  }

  try {
    const files = fs.readdirSync(imgDir);
    const employeeIds = files
      .filter(file => CONFIG.supportedFormats.includes(path.extname(file).toLowerCase()))
      .map(file => path.parse(file).name)
      .sort();

    const data = {
      employees: employeeIds,
      total: employeeIds.length,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(CONFIG.outputJson, JSON.stringify(data, null, 2));
    log(`✓ 提取成功！找到 ${employeeIds.length} 个工号`, 'success');
    log(`✓ 数据已保存至: ${CONFIG.outputJson}`, 'success');
  } catch (error) {
    log(`失败: ${error.message}`, 'error');
  }
}

/**
 * 图片处理相关逻辑 (由原 prepare-images.js 迁移)
 */

function getImageFiles(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).filter(file => 
    CONFIG.supportedFormats.includes(path.extname(file).toLowerCase())
  );
}

async function renameByOrder() {
  const sourceImages = getImageFiles(CONFIG.sourceFolder);
  if (sourceImages.length === 0) {
    log(`源文件夹 ${CONFIG.sourceFolder} 中没有图片！`, 'error');
    return;
  }
  
  if (!fs.existsSync(CONFIG.targetFolder)) fs.mkdirSync(CONFIG.targetFolder, { recursive: true });

  let count = 0;
  for (let i = 0; i < Math.min(sourceImages.length, CONFIG.totalEmployees); i++) {
    const id = CONFIG.employeeIdStart + i;
    const sourcePath = path.join(CONFIG.sourceFolder, sourceImages[i]);
    const targetPath = path.join(CONFIG.targetFolder, `${id}${CONFIG.targetFormat}`);
    fs.copyFileSync(sourcePath, targetPath);
    count++;
  }
  log(`✓ 完成！重命名并复制了 ${count} 张图片`, 'success');
}

async function checkIntegrity() {
  const existing = new Set(getImageFiles(CONFIG.targetFolder).map(f => path.parse(f).name));
  const missing = [];
  for (let i = 0; i < CONFIG.totalEmployees; i++) {
    const id = `${CONFIG.employeeIdStart + i}`;
    if (!existing.has(id)) missing.push(id);
  }

  log(`已存在: ${existing.size}/${CONFIG.totalEmployees}`, 'info');
  if (missing.length > 0) {
    log(`缺失: ${missing.length} 个工号`, 'warning');
    const gen = await question('是否生成占位符? (y/n): ');
    if (gen.toLowerCase() === 'y') {
      try {
        const sharp = require('sharp');
        for (const id of missing) {
          await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 218, g: 165, b: 32 } } })
            .jpeg().toFile(path.join(CONFIG.targetFolder, `${id}${CONFIG.targetFormat}`));
        }
        log('✓ 占位符生成成功', 'success');
      } catch (e) {
        log('失败: 需要安装 sharp 库 (npm install sharp)', 'error');
      }
    }
  } else {
    log('✓ 图片完整性检查通过！', 'success');
  }
}

async function main() {
  console.clear();
  log('╔════════════════════════════════════════════╗', 'info');
  log('║      SUNNY 签名墙管理工具 v2.0            ║', 'info');
  log('╚════════════════════════════════════════════╝', 'info');

  while (true) {
    log('请选择操作:', 'info');
    log('  1. 同步工号列表 (扫描 imgs 并更新 JSON)', 'info');
    log('  2. 检查图片完整性与生成占位符', 'info');
    log('  3. 按顺序重命名源图片 (source -> imgs)', 'info');
    log('  4. 退出', 'info');

    const choice = await question('请输入选项 (1-4): ');

    switch (choice.trim()) {
      case '1': await syncEmployeeIds(); break;
      case '2': await checkIntegrity(); break;
      case '3': await renameByOrder(); break;
      case '4': log('再见！'); rl.close(); return;
      default: log('无效选项', 'error');
    }
    await question('按回车继续...');
  }
}

main().catch(err => {
  log(`发生错误: ${err.message}`, 'error');
  rl.close();
});
