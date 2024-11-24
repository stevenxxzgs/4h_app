import React, { useState } from 'react';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "sk-e6387b460bc047138c629f3e293fa449",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  dangerouslyAllowBrowser: true 
});

const TravelGuideApp = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [guideData, setGuideData] = useState(null);
  const [error, setError] = useState('');
  const [textContent, setTextContent] = useState('');
  const [processing, setProcessing] = useState({ step: '', progress: 0 });

  const generateSummary = async () => {
    try {
      const systemPrompt = `你是一位专业的美食旅游规划专家。请先总结文章内容，然后按照以下格式输出一份美食游计划：

## 目的地概况
[简要描述目的地美食特色]

## 第一天行程
上午（9:00-12:00）
* [餐厅名称]
   * 地址：[具体地址]
   * 推荐菜品：[2-3个特色菜]
   * 营业时间：[具体时间]
   * 特别提示：[预订建议等]

中午（12:00-15:00）
[相同格式]

晚上（18:00-21:00）
[相同格式]

## 第二天行程
[相同格式]

## 美食贴士
* [注意事项]
* [实用建议]

请用markdown格式输出，确保时间安排合理，路线规划高效。`;

      const completion = await openai.chat.completions.create({
        model: "qwen-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: textContent }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`生成失败: ${error.message}`);
    }
  };

  const extractStructuredData = async (summaryText) => {
    try {
      const systemPrompt = `请将以下美食游计划转换为结构化数据。请严格按照以下JSON格式输出：
{
  "destination": {
    "name": "目的地名称",
    "overview": "美食特色概述"
  },
  "days": [
    {
      "day": 1,
      "schedule": [
        {
          "time": "时间段",
          "restaurant": "餐厅名称",
          "address": "具体地址",
          "dishes": ["推荐菜品"],
          "opening_hours": "营业时间",
          "tips": "特别提示"
        }
      ]
    }
  ],
  "tips": [
    {
      "content": "建议内容"
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: "qwen-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: summaryText }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content.trim();
      const parsedData = JSON.parse(response);
      
      // 确保数据结构正确
      if (!parsedData.days || !Array.isArray(parsedData.days)) {
        throw new Error('数据格式错误：days 必须是数组');
      }

      // 确保每天的 schedule 是数组
      parsedData.days = parsedData.days.map(day => ({
        ...day,
        schedule: Array.isArray(day.schedule) ? day.schedule : []
      }));

      return parsedData;
    } catch (error) {
      throw new Error(`结构化提取失败: ${error.message}`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!textContent) {
      setError('请输入内容');
      return;
    }

    setLoading(true);
    setError('');
    setSummary('');
    setGuideData(null);
    
    try {
      setProcessing({ step: 'summary', progress: 33 });
      const summaryResult = await generateSummary();
      setSummary(summaryResult);

      setProcessing({ step: 'structure', progress: 66 });
      const structuredData = await extractStructuredData(summaryResult);
      setGuideData(structuredData);
      
      setProcessing({ step: 'complete', progress: 100 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">巴厘岛美食地图生成器</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="请粘贴美食文章内容..."
                className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[200px]"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                生成美食地图
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${processing.progress}%` }}
              ></div>
            </div>
            <p className="mt-4 text-gray-600">
              {processing.step === 'summary' && '正在分析美食信息...'}
              {processing.step === 'structure' && '正在规划行程路线...'}
              {processing.step === 'complete' && '处理完成！'}
            </p>
          </div>
        ) : (
          <>
            {summary && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">美食游览建议</h3>
                <div className="prose prose-blue max-w-none">
                  {summary.split('\n').map((line, index) => (
                    <p key={index} className="text-gray-600">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {guideData && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">{guideData.destination.name} 美食地图</h2>
                  <p className="text-gray-600">{guideData.destination.overview}</p>
                </div>

                {guideData.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">第 {day.day} 天</h3>
                    <div className="space-y-6">
                      {Array.isArray(day.schedule) && day.schedule.length > 0 ? (
                        day.schedule.map((item, itemIndex) => (
                          <div key={itemIndex} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {item.time || '时间未指定'}
                              </span>
                              <h4 className="font-semibold text-gray-800">{item.restaurant}</h4>
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-gray-600">📍 地址：{item.address || '地址未提供'}</p>
                              <div className="flex flex-wrap gap-2 my-2">
                                {Array.isArray(item.dishes) && item.dishes.map((dish, dishIndex) => (
                                  <span key={dishIndex} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                                    {dish}
                                  </span>
                                ))}
                              </div>
                              <p className="text-gray-600">⏰ 营业时间：{item.opening_hours || '未提供'}</p>
                              <p className="text-gray-600">💡 提示：{item.tips || '无特别提示'}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">暂无行程安排</p>
                      )}
                    </div>
                  </div>
                ))}

                {guideData.tips && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">美食贴士</h3>
                    <div className="space-y-2">
                      {guideData.tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="mt-1 text-yellow-500">•</span>
                          <p className="text-gray-600">{tip.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TravelGuideApp;