import React, { useState } from 'react';

const ResumeApp = () => {
  const [loading, setLoading] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState('');

  const analyzePDF = async (text) => {
    try {
      console.log("发送给API的文本内容:", text.substring(0, 500) + "..."); // 打印前500个字符用于调试

      const systemPrompt = `你是一个简历分析助手。你的任务是将简历文本解析为结构化的JSON数据。
请注意：
1. 必须返回合法的JSON格式
2. JSON必须包含以下字段，每个字段都不能为空：
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

      const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sk-be7ed61f18974a55949ec5daf6622e84`, // 替换为您的实际API密钥
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请分析这份简历并严格按照上述JSON格式返回数据:\n${text}` }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP错误！状态码：${response.status}`);
      }

      const data = await response.json();
      console.log("API返回的原始数据:", data); // 打印API返回的原始数据用于调试

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("API返回数据格式不正确");
      }

      const parsedContent = JSON.parse(data.choices[0].message.content);
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
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileText = e.target.result;
          console.log("文件读取结果:", fileText.substring(0, 500) + "..."); // 打印前500个字符用于调试

          if (!fileText.trim()) {
            throw new Error("文件内容为空");
          }

          setPdfText(fileText);
          const analysisResult = await analyzePDF(fileText);
          setResumeData(analysisResult);
        } catch (err) {
          console.error("处理错误:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('文件读取失败');
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const downloadResume = () => {
    const htmlContent = document.getElementById('resume-content').outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '智能简历.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 上传区域 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">智能简历生成器</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              className="flex-1 p-2 border rounded hover:border-blue-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={downloadResume}
              disabled={!resumeData || loading}
              className={`px-4 py-2 rounded font-medium ${
                !resumeData || loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              下载简历
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">正在解析简历...</p>
          </div>
        ) : resumeData ? (
          <div id="resume-content">
            {/* 个人信息卡片 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {resumeData.basicInfo.name?.[0] || '未知'}
                </div>
                <div className="ml-6">
                  <h1 className="text-3xl font-bold text-gray-800">
                    {resumeData.basicInfo.name}
                  </h1>
                  <p className="text-xl text-blue-600">{resumeData.basicInfo.major}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-600">📧 {resumeData.basicInfo.email}</p>
                    <p className="text-gray-600">📱 {resumeData.basicInfo.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 教育经历 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">教育经历</h2>
              <div className="space-y-4">
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-700">{edu.school}</h3>
                      <p className="text-gray-600">{edu.major}</p>
                    </div>
                    <p className="text-gray-500">{edu.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 工作经历 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">工作经历</h2>
              <div className="space-y-4">
                {resumeData.work.map((work, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-gray-700">{work.company}</h3>
                      <p className="text-gray-500">{work.time}</p>
                    </div>
                    <p className="text-blue-600">{work.position}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 专业技能 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">专业技能</h2>
              <div className="grid grid-cols-2 gap-4">
                {resumeData.skills.map((skill, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-4">
                    <p className="text-gray-600">{skill}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 项目经历 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">项目经历</h2>
              <div className="space-y-6">
                {resumeData.projects.map((project, index) => (
                  <div key={index}>
                    <h3 className="text-xl font-semibold text-blue-700">{project.name}</h3>
                    <p className="text-gray-500">{project.role} | {project.time}</p>
                    <p className="mt-2 text-gray-600">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 成就 */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">主要成就</h2>
              <ul className="list-disc pl-6 space-y-2">
                {resumeData.achievements.map((achievement, index) => (
                  <li key={index} className="text-gray-600">{achievement}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600">请上传PDF简历文件开始生成</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeApp;