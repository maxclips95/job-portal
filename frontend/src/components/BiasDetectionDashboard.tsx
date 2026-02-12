'use client';

import { useState, useEffect } from 'react';
import { predictiveService } from '@/services/predictive.service';
import { AlertTriangle, CheckCircle, TrendingDown, Users, Shield, Zap } from 'lucide-react';

export const BiasDetectionDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [biasReport, setBiasReport] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadBiasData();
  }, []);

  const loadBiasData = async () => {
    try {
      setLoading(true);
      const [report, recs] = await Promise.all([
        predictiveService.getBiasReport({ includeActionItems: true }),
        predictiveService.getBiasRecommendations(),
      ]);

      setBiasReport(report);
      setRecommendations(recs || []);
    } catch (error) {
      console.error('Failed to load bias data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-lg" />)}</div>;
  }

  const getBiasScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600';
    if (score >= 0.5) return 'text-orange-600';
    return 'text-green-600';
  };

  const getBiasScoreBg = (score: number) => {
    if (score >= 0.8) return 'from-red-100 to-red-50';
    if (score >= 0.5) return 'from-orange-100 to-orange-50';
    return 'from-green-100 to-green-50';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={28} className="text-blue-600" />
          Fairness & Bias Detection
        </h2>
        <p className="text-gray-600 mt-2">Monitoring algorithmic fairness across all predictions and recommendations</p>
      </div>

      {/* Overall Bias Score */}
      {biasReport && (
        <div className={`bg-gradient-to-br ${getBiasScoreBg(biasReport.overallBiasScore)} rounded-lg p-8 border ${
          biasReport.overallBiasScore >= 0.8
            ? 'border-red-300'
            : biasReport.overallBiasScore >= 0.5
              ? 'border-orange-300'
              : 'border-green-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overall Bias Score</h3>
              <p className="text-gray-600 mt-1">Lower is better • Last updated: {new Date(biasReport.generatedAt).toLocaleDateString()}</p>
            </div>

            <div className="text-center">
              <div className={`text-5xl font-bold ${getBiasScoreColor(biasReport.overallBiasScore)}`}>
                {(biasReport.overallBiasScore * 100).toFixed(1)}%
              </div>

              <div className="w-32 h-3 bg-gray-300 rounded-full mt-4 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    biasReport.overallBiasScore >= 0.8
                      ? 'bg-red-600'
                      : biasReport.overallBiasScore >= 0.5
                        ? 'bg-orange-600'
                        : 'bg-green-600'
                  }`}
                  style={{ width: `${biasReport.overallBiasScore * 100}%` }}
                />
              </div>

              <p className="text-sm font-medium text-gray-700 mt-2">
                {biasReport.overallBiasScore >= 0.8 ? '⚠️ High Risk' : biasReport.overallBiasScore >= 0.5 ? '⚡ Medium Risk' : '✅ Low Risk'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium">Metrics Analyzed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{biasReport.totalMetricsAnalyzed}</p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium">Biases Detected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{biasReport.biasesDetected}</p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 font-medium">Metrics Clean</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{biasReport.totalMetricsAnalyzed - biasReport.biasesDetected}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bias Categories */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-orange-600" />
          Detected Biases by Category
        </h3>

        <div className="space-y-4">
          {biasReport?.actionItems
            ?.reduce((acc: any, item: any) => {
              const category = item.action.split(' ')[0];
              if (!acc.find((a: any) => a.category === category)) {
                acc.push({ category, items: [item] });
              } else {
                acc.find((a: any) => a.category === category).items.push(item);
              }
              return acc;
            }, [])
            .map((group: any, idx: number) => (
              <div key={idx} className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{group.category} Bias</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(group.items[0]?.priority)}`}>
                    {group.items[0]?.priority?.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map((item: any, aidx: number) => (
                    <div key={aidx} className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{item.action}</p>
                      <p className="text-xs text-gray-600 mt-1">Expected Impact: {item.expectedImpact}</p>
                      <p className={`text-xs font-medium mt-1 ${
                        item.implementationEffort === 'low'
                          ? 'text-green-600'
                          : item.implementationEffort === 'medium'
                            ? 'text-orange-600'
                            : 'text-red-600'
                      }`}>
                        Effort: {item.implementationEffort}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap size={20} className="text-yellow-600" />
          Priority Actions
        </h3>

        <div className="space-y-3">
          {biasReport?.actionItems?.slice(0, 5).map((action: any, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${
                action.priority === 'critical'
                  ? 'border-l-red-600 bg-red-50 border border-red-200'
                  : action.priority === 'high'
                    ? 'border-l-orange-600 bg-orange-50 border border-orange-200'
                    : 'border-l-yellow-600 bg-yellow-50 border border-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{action.action}</p>
                  <p className="text-sm text-gray-600 mt-1">{action.expectedImpact}</p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-4 ${getPriorityColor(action.priority)}`}>
                  {action.priority}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-300 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Effort:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        (action.implementationEffort === 'low' && i === 1) ||
                        (action.implementationEffort === 'medium' && i <= 2) ||
                        action.implementationEffort === 'high'
                          ? 'bg-gray-800'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2">
          <CheckCircle size={18} />
          View Full Bias Report
        </button>
      </div>

      {/* Fairness Pledge */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-300 p-6">
        <div className="flex items-start gap-4">
          <Shield size={24} className="text-green-600 flex-shrink-0 mt-1" />

          <div>
            <h3 className="font-semibold text-gray-900">Our Commitment to Fairness</h3>
            <p className="text-gray-600 text-sm mt-2">
              We continuously monitor our algorithms for bias and work to ensure fair treatment across all demographics. Our bias detection system runs monthly to identify and address any discriminatory patterns in predictions and recommendations.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600" />
                Monthly bias audits across 6 dimensions
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600" />
                Transparent bias scoring and reporting
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-green-600" />
                Actionable recommendations for improvement
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
