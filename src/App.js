import React, { useState } from 'react';
import OpenAI from "openai";
// 导入所需的 Lucide 图标
import { MapPin } from 'lucide-react';
import { Clock } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">旅游地图生成器</h1>
          <p className="text-lg text-gray-600">输入文章内容，一键生成个性化旅游地图</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="请粘贴文章内容..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px] text-gray-700"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-xl font-medium shadow-lg transform transition duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '生成中...' : '生成地图'}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${processing.progress}%` }}
              ></div>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-700">
              {processing.step === 'summary' && '正在分析美食信息...'}
              {processing.step === 'structure' && '正在规划行程路线...'}
              {processing.step === 'complete' && '处理完成！'}
            </p>
          </div>
        )}

        {/* Results Section */}
        {!loading && (
          <>
            {summary && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                  游览建议
                </h3>
                <div className="prose prose-lg prose-blue max-w-none">
                  {summary.split('\n').map((line, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {guideData && (
              <div className="space-y-8">
                {/* Destination Overview */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-gray-900">{guideData.destination.name} 美食地图</h2>
                      <p className="mt-2 text-lg text-gray-600">{guideData.destination.overview}</p>
                    </div>
                  </div>
                </div>

                {/* Daily Schedule */}
                {guideData.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                      第 {day.day} 天行程
                    </h3>
                    <div className="space-y-8">
                      {Array.isArray(day.schedule) && day.schedule.length > 0 ? (
                        day.schedule.map((item, itemIndex) => (
                          <div key={itemIndex} className="relative pl-6 border-l-2 border-blue-500">
                            <div className="mb-4">
                              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mb-2">
                                {item.time || '时间未指定'}
                              </span>
                              <h4 className="text-xl font-bold text-gray-900">{item.restaurant}</h4>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex items-start gap-2 text-gray-600">
                                <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                                <p>{item.address || '地址未提供'}</p>
                              </div>
                              
                              <div className="flex gap-2 flex-wrap mt-3">
                                {Array.isArray(item.dishes) && item.dishes.map((dish, dishIndex) => (
                                  <span key={dishIndex} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {dish}
                                  </span>
                                ))}
                              </div>
                              
                              <div className="flex items-start gap-2 text-gray-600">
                                <Clock className="w-5 h-5 mt-1 flex-shrink-0" />
                                <p>{item.opening_hours || '营业时间未提供'}</p>
                              </div>
                              
                              {item.tips && (
                                <div className="flex items-start gap-2 text-gray-600">
                                  <AlertCircle className="w-5 h-5 mt-1 flex-shrink-0" />
                                  <p>{item.tips}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic text-center">暂无行程安排</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Tips Section */}
                {guideData.tips && guideData.tips.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
                      美食贴士
                    </h3>
                    <div className="grid gap-4">
                      {guideData.tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                          <p className="text-gray-700">{tip.content}</p>
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