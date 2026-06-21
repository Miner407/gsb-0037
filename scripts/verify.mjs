import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const BASE_URL = 'http://localhost:3001/api';
const SAMPLE_FILE = path.join(__dirname, '..', 'examples', 'sample-bookmarks.html');

let passed = 0;
let failed = 0;

function log(color, prefix, message) {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
  };
  console.log(`${colors[color] || ''}${prefix}${colors.reset} ${message}`);
}

function assert(condition, testName) {
  if (condition) {
    passed++;
    log('green', '✓ PASS ', testName);
  } else {
    failed++;
    log('red', '✗ FAIL ', testName);
  }
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  return res.json();
}

async function waitForServer(maxRetries = 30) {
  log('cyan', 'ℹ INFO ', '等待服务器启动...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        log('green', '✓ OK   ', '服务器已就绪');
        return true;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

async function runTests() {
  log('bold', '', '\n========== 本地书签收藏与重复链接清理器 - 验证测试 ==========\n');

  log('white', '', '\n--- 阶段 0: README 关键内容检查 ---');

  const readmePath = path.join(ROOT, 'README.md');
  const readmeExists = fs.existsSync(readmePath);
  assert(readmeExists, 'README.md 文件存在');
  if (readmeExists) {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    assert(!readme.includes('React + TypeScript + Vite'), 'README 不再是脚手架模板说明');
    assert(readme.includes('书签') || readme.includes('bookmark'), 'README 包含项目用途说明');
    assert(readme.includes('npm install') || readme.includes('npm run'), 'README 包含安装/启动命令');
    assert(readme.includes('import') || readme.includes('导入'), 'README 包含导入相关说明');
  }

  log('white', '', '\n--- 阶段 0.1: 忽略规则检查 ---');

  const gitignorePath = path.join(ROOT, '.gitignore');
  const gitignoreExists = fs.existsSync(gitignorePath);
  assert(gitignoreExists, '.gitignore 文件存在');
  if (gitignoreExists) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    assert(gitignore.includes('node_modules'), '.gitignore 包含 node_modules');
    assert(gitignore.includes('dist'), '.gitignore 包含 dist');
    assert(gitignore.includes('data/*.db') || gitignore.includes('*.db'), '.gitignore 包含数据库文件忽略规则');
    assert(gitignore.includes('.env'), '.gitignore 包含 .env 忽略规则');
  }

  if (!(await waitForServer())) {
    log('red', '✗ ERROR', '无法连接到服务器，请先运行 npm run dev 启动服务');
    process.exit(1);
  }

  log('white', '', '\n--- 阶段 1: 导入预览 ---');

  const fileContent = fs.readFileSync(SAMPLE_FILE);
  const previewFormData = new FormData();
  previewFormData.append('file', new Blob([fileContent], { type: 'text/html' }), 'sample-bookmarks.html');

  const previewRes = await fetch(`${BASE_URL}/import/preview`, {
    method: 'POST',
    body: previewFormData,
  });
  const previewData = await previewRes.json();
  assert(previewData.success === true, '导入预览 API 返回成功');
  assert(previewData.data.totalParsed > 0, `预览解析到 ${previewData.data.totalParsed} 条书签`);
  assert(typeof previewData.data.existingCount === 'number', `已存在 URL 数量: ${previewData.data.existingCount}`);
  assert(typeof previewData.data.batchDuplicateCount === 'number', `同批重复 URL 数量: ${previewData.data.batchDuplicateCount}`);
  assert(typeof previewData.data.folderStats === 'object', '预览返回文件夹统计');
  assert(typeof previewData.data.domainStats === 'object', '预览返回域名统计');
  log('cyan', 'ℹ INFO ', `预览: ${previewData.data.totalParsed} 条待解析, ${previewData.data.existingCount} 条已存在`);

  log('white', '', '\n--- 阶段 2: 确认导入 ---');

  const formData = new FormData();
  formData.append('file', new Blob([fileContent], { type: 'text/html' }), 'sample-bookmarks.html');

  const importRes = await fetch(`${BASE_URL}/import`, {
    method: 'POST',
    body: formData,
  });
  const importData = await importRes.json();
  assert(importData.success === true, '导入 API 返回成功');
  assert(importData.data !== undefined, '导入结果包含数据');
  const initialImport = importData.data;
  assert(initialImport.success > 0, `成功导入 ${initialImport.success} 条书签`);
  assert(typeof initialImport.skipped === 'number', `跳过 ${initialImport.skipped} 条重复`);

  log('white', '', '\n--- 阶段 3: 再次导入（验证重复检测） ---');

  const formData2 = new FormData();
  formData2.append('file', new Blob([fileContent], { type: 'text/html' }), 'sample-bookmarks.html');
  const importRes2 = await fetch(`${BASE_URL}/import`, {
    method: 'POST',
    body: formData2,
  });
  const importData2 = await importRes2.json();
  assert(importData2.success === true, '第二次导入 API 返回成功');
  assert(importData2.data.success === 0, '重复导入时跳过所有已有书签（success = 0）');
  assert(importData2.data.skipped > 0, `跳过了 ${importData2.data.skipped} 条已有书签`);

  log('white', '', '\n--- 阶段 4: 统计概览 ---');

  const overview = await request('/stats/overview');
  assert(overview.success === true, '获取统计概览成功');
  assert(overview.data.totalCount > 0, `书签总数 > 0 (当前: ${overview.data.totalCount})`);
  assert(overview.data.domainCount > 0, `域名数 > 0 (当前: ${overview.data.domainCount})`);
  assert(typeof overview.data.duplicateCount === 'number', `重复链接数: ${overview.data.duplicateCount}`);
  assert(typeof overview.data.archivedCount === 'number', `已归档数: ${overview.data.archivedCount}`);

  log('white', '', '\n--- 阶段 5: 重复链接检测与保留其一归档其余 ---');

  const duplicates = await request('/stats/duplicates');
  assert(duplicates.success === true, '获取重复链接列表成功');
  assert(Array.isArray(duplicates.data), '重复链接数据为数组');
  assert(duplicates.data.length > 0, `检测到 ${duplicates.data.length} 组重复链接`);

  if (duplicates.data.length > 0) {
    const firstDup = duplicates.data[0];
    assert(firstDup.url !== undefined, '重复条目包含 URL');
    assert(firstDup.count >= 2, `重复次数 >= 2 (当前: ${firstDup.count})`);
    assert(Array.isArray(firstDup.bookmarks), '重复条目包含书签列表');
    assert(firstDup.bookmarks.length === firstDup.count, '书签数量与重复次数一致');
    log('cyan', 'ℹ INFO ', `发现重复 URL: ${firstDup.url} (${firstDup.count} 次)`);

    const keepBookmark = firstDup.bookmarks[0];
    const dedupRes = await request('/bookmarks/deduplicate', {
      method: 'POST',
      body: JSON.stringify({ keepId: keepBookmark.id }),
    });
    assert(dedupRes.success === true, '保留其一归档其余 API 返回成功');
    assert(dedupRes.data.keepId === keepBookmark.id, '返回保留的书签 ID');
    assert(dedupRes.data.archived >= 0, `归档了 ${dedupRes.data.archived} 条重复项`);
    assert(Array.isArray(dedupRes.data.archivedBookmarks), '返回归档的书签列表');
    if (dedupRes.data.archived > 0) {
      assert(dedupRes.data.archivedBookmarks.length === dedupRes.data.archived, '归档书签数量与报告一致');
      log('cyan', 'ℹ INFO ', `归档: ${dedupRes.data.archivedBookmarks.map(b => b.title).join(', ')}`);
    }
  }

  log('white', '', '\n--- 阶段 6: 文件夹和标签筛选 ---');

  const folders = await request('/bookmarks/folders');
  assert(folders.success === true, '获取文件夹列表成功');
  assert(Array.isArray(folders.data), '文件夹列表为数组');
  assert(folders.data.length > 0, `检测到 ${folders.data.length} 个文件夹`);

  const tags = await request('/bookmarks/tags');
  assert(tags.success === true, '获取标签列表成功');
  assert(Array.isArray(tags.data), '标签列表为数组');

  if (tags.data.length > 0) {
    const firstTag = tags.data[0];
    const tagFilterRes = await request(`/bookmarks?tags=${encodeURIComponent(firstTag)}`);
    assert(tagFilterRes.success === true, '按标签筛选 API 调用成功');
    assert(Array.isArray(tagFilterRes.data), '标签筛选返回数组');
    log('cyan', 'ℹ INFO ', `标签 "${firstTag}" 筛选返回 ${tagFilterRes.data.length} 条书签`);
  }

  if (folders.data.length > 0) {
    const folderFilterRes = await request(`/bookmarks?folder=${encodeURIComponent(folders.data[0])}`);
    assert(folderFilterRes.success === true, '按文件夹筛选 API 调用成功');
    assert(Array.isArray(folderFilterRes.data), '文件夹筛选返回数组');
    log('cyan', 'ℹ INFO ', `文件夹 "${folders.data[0]}" 筛选返回 ${folderFilterRes.data.length} 条书签`);
  }

  log('white', '', '\n--- 阶段 7: 时间范围筛选 ---');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

  const timeFilterRes = await request(`/bookmarks?importedAfter=${weekAgo}&importedBefore=${tomorrow}`);
  assert(timeFilterRes.success === true, '时间范围筛选 API 调用成功');
  assert(Array.isArray(timeFilterRes.data), '时间范围筛选返回数组');
  log('cyan', 'ℹ INFO ', `时间范围筛选返回 ${timeFilterRes.data.length} 条书签`);

  log('white', '', '\n--- 阶段 8: 域名统计 ---');

  const domains = await request('/stats/domains');
  assert(domains.success === true, '获取域名统计成功');
  assert(Array.isArray(domains.data), '域名统计数据为数组');
  assert(domains.data.length === overview.data.domainCount, '域名数量与概览一致');

  if (domains.data.length > 1) {
    const counts = domains.data.map(d => d.count);
    const isDescending = counts.every((c, i) => i === 0 || c <= counts[i - 1]);
    assert(isDescending, '域名按书签数量降序排列');
  }

  log('white', '', '\n--- 阶段 9: 统计看板字段验证 ---');

  const suggestions = await request('/stats/cleanup-suggestions');
  assert(suggestions.success === true, '获取清理建议成功');
  assert(typeof suggestions.data.duplicateGroups === 'number', `重复 URL 组数: ${suggestions.data.duplicateGroups}`);
  assert(typeof suggestions.data.archiveableCount === 'number', `可归档重复项数量: ${suggestions.data.archiveableCount}`);
  assert(Array.isArray(suggestions.data.topDomains7d), '7天热门域名为数组');
  assert(typeof suggestions.data.emptyTitleCount === 'number', `空标题书签数量: ${suggestions.data.emptyTitleCount}`);
  assert(typeof suggestions.data.invalidUrlCount === 'number', `无效 URL 数量: ${suggestions.data.invalidUrlCount}`);
  log('cyan', 'ℹ INFO ', `清理建议: ${suggestions.data.duplicateGroups} 组重复, ${suggestions.data.archiveableCount} 项可归档, ${suggestions.data.emptyTitleCount} 空标题, ${suggestions.data.invalidUrlCount} 无效URL`);

  log('white', '', '\n--- 阶段 10: 书签搜索 ---');

  const searchRes = await request('/bookmarks?search=react');
  assert(searchRes.success === true, '搜索 API 调用成功');
  assert(Array.isArray(searchRes.data), '搜索返回数组');
  assert(searchRes.data.length > 0, `搜索 "react" 返回 ${searchRes.data.length} 条结果`);

  log('white', '', '\n--- 阶段 11: 最近导入记录 ---');

  const recent = await request('/stats/recent?limit=5');
  assert(recent.success === true, '获取最近导入记录成功');
  assert(recent.data.length <= 5, '最近导入记录不超过限制数量');
  assert(recent.data.length > 0, '最近导入记录不为空');

  log('white', '', '\n--- 阶段 12: Lint 检查 ---');

  try {
    execSync('npm run lint', { cwd: ROOT, stdio: 'pipe' });
    assert(true, 'npm run lint 通过');
  } catch {
    assert(false, 'npm run lint 未通过');
  }

  log('white', '', '\n--- 阶段 13: 工作区整洁度检查 ---');

  try {
    const gitStatus = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' });
    const lines = gitStatus.trim().split('\n').filter(Boolean);
    const dbUntracked = lines.some(l => l.includes('.db'));
    const distUntracked = lines.some(l => l.includes('dist/') || l.includes('dist\\'));
    assert(!dbUntracked, '工作区无未跟踪的 .db 文件');
    assert(!distUntracked, '工作区无未跟踪的 dist 构建产物');
    log('cyan', 'ℹ INFO ', `Git 状态: ${lines.length} 个变更文件`);
  } catch {
    log('yellow', '⚠ WARN ', '无法运行 git status 检查（可能不是 git 仓库）');
  }

  log('white', '', '\n============================================================');
  log('bold', '', `测试完成: ${passed} 通过, ${failed} 失败`);
  log('white', '', '============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n测试运行出错:', err.message);
  process.exit(1);
});
