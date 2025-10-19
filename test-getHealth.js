// 模拟 getHealth 函数的逻辑
async function testGetHealth() {
    const axios = require('axios');
    
    try {
        // 模拟 axios.get 调用
        const response = await axios.get('http://localhost:3000/api/proxy/system/health');
        const data = response.data;
        
        console.log('1. 原始响应数据:');
        console.log(JSON.stringify(data, null, 2));
        
        // 模拟 getHealth 函数的处理逻辑
        const processed = data.data?.data || data.data || data;
        
        console.log('\n2. getHealth 函数处理后的数据:');
        console.log(JSON.stringify(processed, null, 2));
        
        console.log('\n3. 健康状态值:');
        console.log('processed.status:', processed.status);
        
        console.log('\n4. 前端代码中的取值:');
        console.log('health?.data?.status:', processed?.status);
        
        console.log('\n5. 最终显示的状态:');
        const healthStatus = processed?.status ?? 'unknown';
        console.log('healthStatus:', healthStatus);
        console.log('显示文本:', healthStatus === 'healthy' ? '正常' : '异常');
        
    } catch (error) {
        console.error('错误:', error.message);
    }
}

testGetHealth();
