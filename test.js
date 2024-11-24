const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY, // 如果没有配置环境变量，请用实际的 API Key 替换
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
});

// 简历解析函数
async function analyzeResume(text) {
    try {
        console.log("发送给API的文本内容:", text.substring(0, 500) + "..."); // 打印前500个字符用于调试

        const systemPrompt = `你是一个简历分析助手。你的任务是将简历文本解析为结构化的JSON数据。请注意：

必须返回合法的JSON格式
JSON必须包含以下字段，每个字段都不能为空：
{
"basicInfo": {
"name": "姓名",
"email": "邮箱",
"phone": "电话",
"age": "年龄",
"major": "专业"
},
"education": [
{
"school": "学校名称",
"time": "时间段",
"major": "专业"
}
],
"work": [
{
"company": "公司名称",
"position": "职位",
"time": "时间段"
}
],
"skills": ["技能1", "技能2"],
"projects": [
{
"name": "项目名称",
"role": "担任角色",
"time": "时间段",
"description": "项目描述"
}
],
"achievements": ["成就1", "成就2"]
}`;
const completion = await openai.chat.completions.create({
    model: "qwen-plus",  // 模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
    messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请分析这份简历并严格按照上述JSON格式返回数据:\n${text}` }
    ]
});

console.log("API返回的原始数据:", JSON.stringify(completion, null, 2)); // 打印API返回的原始数据用于调试

if (!completion.choices?.[0]?.message?.content) {
    throw new Error("API返回数据格式不正确");
}

const parsedContent = JSON.parse(completion.choices[0].message.content);
console.log("解析后的JSON数据:", parsedContent); // 打印解析后的JSON数据用于调试

// 验证必要字段
const requiredFields = ['basicInfo', 'education', 'work', 'skills', 'projects', 'achievements'];
const missingFields = requiredFields.filter(field => !parsedContent[field]);

if (missingFields.length > 0) {
    throw new Error(`数据缺少必要字段: ${missingFields.join(', ')}`);
}

return parsedContent;
} catch (error) {
console.error("API调用或数据解析错误:", error);
if (error.message.includes("Unexpected token")) {
    throw new Error("API返回的数据不是有效的JSON格式");
} else {
    throw new Error(`简历解析失败: ${error.message}`);
}
}}
async function main() {
    const resumeText = `张三
联系方式：
手机：12345678901
邮箱：zhangsan@example.com

教育背景：
2015.09 - 2019.06 清华大学 计算机科学与技术

工作经历：
2019.07 - 至今 腾讯公司 软件工程师

技能：
1. Java
2. Python
3. 数据库管理

项目经验：
项目一：
时间：2018.03 - 2018.06
角色：开发人员
描述：负责系统的后端开发，使用Java和Spring Boot框架。

成就：
1. 在校期间获得全国大学生程序设计竞赛一等奖
2. 发表多篇学术论文`;

    try {
        const parsedResume = await analyzeResume(resumeText);
        console.log("解析后的简历数据:", JSON.stringify(parsedResume, null, 2));
    } catch (error) {
        console.error("简历解析失败:", error.message);
    }
}

main();