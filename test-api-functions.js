// 测试API函数是否正确工作
const axios = require('axios');

// 模拟API配置
const api = axios.create({
  baseURL: '/api/proxy',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 模拟getHealth函数
async function testGetHealth() {
  try {
    console.log('测试 getHealth 函数...');
    const { data } = await api.get('/system/health');
    console.log('1. 原始响应:', JSON.stringify(data, null, 2));
    
    // 处理双重嵌套的数据结构: response.data.data.data
    const processed = data.data?.data || data.data || data;
    console.log('2. 处理后的数据:', JSON.stringify(processed, null, 2));
    console.log('3. 状态值:', processed.status);
    
    return processed;
  } catch (error) {
    console.error('getHealth 错误:', error.message);
    throw error;
  }
}

// 模拟getStats函数
async function testGetStats() {
  try {
    console.log('\n测试 getStats 函数...');
    const { data } = await api.get('/system/stats');
    console.log('1. 原始响应:', JSON.stringify(data, null, 2));
    
    // 处理双重嵌套的数据结构: response.data.data.data
    const processed = data.data?.data || data.data || data;
    console.log('2. 处理后的数据:', JSON.stringify(processed, null, 2));
    
    return processed;
  } catch (error) {
    console.error('getStats 错误:', error.message);
    throw error;
  }
}

// 运行测试
async function runTests() {
  try {
    // 设置正确的baseURL
    api.defaults.baseURL = 'http://localhost:3000/api/proxy';
    
    const healthData = await testGetHealth();
    const statsData = await testGetStats();
    
    console.log('\n=== 测试结果 ===');
    console.log('健康状态:', healthData?.status);
    console.log('统计数据总作业数:', statsData?.totalJobs);
    console.log('测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

runTests();