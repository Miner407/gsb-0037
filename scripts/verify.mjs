import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  if (!(await waitForServer())) {
    log('red', '✗ ERROR', '无法连接到服务器，请先运行 npm run dev 启动服务');
    process.exit(1);
  }

  log('white', '', '\n--- 阶段 1: 导入书签 HTML 文件 ---');

  const fileContent = fs.readFileSync(SAMPLE_FILE);
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

  log('white', '', '\n--- 阶段 2: 再次导入（验证重复检测） ---');

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

  log('white', '', '\n--- 阶段 3: 统计概览 ---');

  const overview = await request('/stats/overview');
  assert(overview.success === true, '获取统计概览成功');
  assert(overview.data.totalCount > 0, `书签总数 > 0 (当前: ${overview.data.totalCount})`);
  assert(overview.data.domainCount > 0, `域名数 > 0 (当前: ${overview.data.domainCount})`);
  assert(typeof overview.data.duplicateCount === 'number', `重复链接数: ${overview.data.duplicateCount}`);
  assert(typeof overview.data.archivedCount === 'number', `已归档数: ${overview.data.archivedCount}`);

  log('white', '', '\n--- 阶段 4: 重复链接检测 ---');

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
  }

  log('white', '', '\n--- 阶段 5: 域名统计 ---');

  const domains = await request('/stats/domains');
  assert(domains.success === true, '获取域名统计成功');
  assert(Array.isArray(domains.data), '域名统计数据为数组');
  assert(domains.data.length === overview.data.domainCount, '域名数量与概览一致');

  if (domains.data.length > 1) {
    const counts = domains.data.map(d => d.count);
    const isDescending = counts.every((c, i) => i === 0 || c <= counts[i - 1]);
    assert(isDescending, '域名按书签数量降序排列');
  }

  log('white', '', '\n--- 阶段 6: 书签列表与搜索 ---');

  const allBookmarks = await request('/bookmarks');
  assert(allBookmarks.success === true, '获取全部书签成功');
  assert(allBookmarks.data.length === overview.data.totalCount, '书签数量与概览一致');

  const searchRes = await request('/bookmarks?search=react');
  assert(searchRes.success === true, '搜索 API 调用成功');
  assert(Array.isArray(searchRes.data), '搜索返回数组');
  const hasReact = searchRes.data.every(b =>
    b.title.toLowerCase().includes('react') ||
    b.url.toLowerCase().includes('react')
  );
  assert(searchRes.data.length > 0, `搜索 "react" 返回 ${searchRes.data.length} 条结果`);

  const domainFilter = await request(`/bookmarks?domain=${domains.data[0]?.domain || ''}`);
  if (domains.data.length > 0) {
    assert(domainFilter.success === true, '按域名筛选 API 调用成功');
    const allMatch = domainFilter.data.every(b => b.domain === domains.data[0].domain);
    assert(allMatch, `按域名筛选结果全部属于 ${domains.data[0].domain}`);
  }

  log('white', '', '\n--- 阶段 7: 最近导入记录 ---');

  const recent = await request('/stats/recent?limit=5');
  assert(recent.success === true, '获取最近导入记录成功');
  assert(recent.data.length <= 5, '最近导入记录不超过限制数量');
  assert(recent.data.length > 0, '最近导入记录不为空');

  if (recent.data.length >= 2) {
    const dates = recent.data.map(b => new Date(b.importedAt).getTime());
    const isDescending = dates.every((d, i) => i === 0 || d <= dates[i - 1]);
    assert(isDescending, '最近导入按时间降序排列');
  }

  log('white', '', '\n--- 阶段 8: 单条书签更新（归档） ---');

  if (allBookmarks.data.length > 0) {
    const testBookmark = allBookmarks.data[0];
    const archiveRes = await request(`/bookmarks/${testBookmark.id}`, {
      method: 'PUT',
      body: JSON.stringify({ archived: true }),
    });
    assert(archiveRes.success === true, '更新书签归档状态成功');
    assert(archiveRes.data.archived === true, '书签已标记为归档');

    const overview2 = await request('/stats/overview');
    assert(overview2.data.archivedCount === overview.data.archivedCount + 1, '归档数增加 1');

    const unarchiveRes = await request(`/bookmarks/${testBookmark.id}`, {
      method: 'PUT',
      body: JSON.stringify({ archived: false }),
    });
    assert(unarchiveRes.success === true, '取消归档成功');
  }

  log('white', '', '\n--- 阶段 9: 批量归档 ---');

  if (duplicates.data.length > 0) {
    const dupBookmarkIds = duplicates.data[0].bookmarks.slice(0, 2).map(b => b.id);
    if (dupBookmarkIds.length >= 2) {
      const batchRes = await request('/bookmarks/batch', {
        method: 'PUT',
        body: JSON.stringify({ ids: dupBookmarkIds, archived: true }),
      });
      assert(batchRes.success === true, '批量归档 API 调用成功');
      assert(batchRes.data.updated === 2, `批量归档了 ${batchRes.data.updated} 条书签`);

      const overview3 = await request('/stats/overview');
      assert(overview3.data.archivedCount >= 2, `归档数 >= 2 (当前: ${overview3.data.archivedCount})`);

      const checkArchived = await request('/bookmarks?archived=true');
      assert(checkArchived.data.length >= 2, '筛选已归档书签返回正确数量');
      log('cyan', 'ℹ INFO ', `当前已归档书签: ${checkArchived.data.length} 条`);

      const unbatchRes = await request('/bookmarks/batch', {
        method: 'PUT',
        body: JSON.stringify({ ids: dupBookmarkIds, archived: false }),
      });
      assert(unbatchRes.success === true, '批量取消归档成功');
    }
  }

  log('white', '', '\n--- 阶段 10: 文件夹列表 ---');

  const folders = await request('/bookmarks/folders');
  assert(folders.success === true, '获取文件夹列表成功');
  assert(Array.isArray(folders.data), '文件夹列表为数组');
  assert(folders.data.length > 0, `检测到 ${folders.data.length} 个文件夹`);
  log('cyan', 'ℹ INFO ', `发现文件夹: ${folders.data.join(', ')}`);

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
