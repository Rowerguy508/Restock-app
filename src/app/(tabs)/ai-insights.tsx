import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { LinearGradient } from "expo-linear-gradient";

interface InsightDashboard {
  summary: {
    headline: string;
    summary: string;
    keyMetrics: { label: string; value: string; change?: string }[];
    alerts: string[];
    recommendations: string[];
  };
  quickStats: {
    totalProducts: number;
    criticalItems: number;
    urgentReorders: number;
    activeInsights: number;
    potentialSavings: number;
  };
  topReorders: {
    productId: string;
    productName: string;
    supplierName?: string;
    currentStock: number;
    daysRemaining: number;
    suggestedQuantity: number;
    estimatedCost: number;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    reason: string;
  }[];
  topInsights: {
    productId?: string;
    productName?: string;
    insight: string;
    severity: "INFO" | "WARN" | "ACTION";
    suggestion: string;
    potentialSavings?: number;
  }[];
  topOptimizations: {
    category: string;
    potentialSavings: number;
    recommendation: string;
  }[];
  generatedAt: string;
}

const urgencyColors = {
  LOW: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  MEDIUM: { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  HIGH: { bg: "#FFEDD5", text: "#EA580C", border: "#FED7AA" },
  CRITICAL: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
};

const severityColors = {
  INFO: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  WARN: { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  ACTION: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
};

export default function AIInsightsScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => api.get<InsightDashboard>("/api/ai/insights-dashboard"),
    enabled: !!session?.user,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !data) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-slate-500 mt-4">Analyzing your data...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <Brain size={48} color="#94A3B8" />
        <Text className="text-slate-500 mt-4 text-center">
          Unable to load AI insights
        </Text>
        <Pressable
          onPress={refetch}
          className="bg-teal-600 rounded-xl px-6 py-3 mt-4"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const { summary, quickStats, topReorders, topInsights, topOptimizations, generatedAt } = data;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={["#0F172A", "#1E3A5F"]}
        style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 20 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white text-sm opacity-80">AI-Powered Insights</Text>
            <Text className="text-white text-2xl font-bold mt-1">Restocka AI</Text>
          </View>
          <View className="bg-white/10 rounded-full px-3 py-1.5 flex-row items-center">
            <Sparkles size={14} color="white" />
            <Text className="text-white text-xs ml-1.5">Live</Text>
          </View>
        </View>

        {/* Summary Card */}
        <View className="bg-white/10 rounded-2xl p-4">
          <Text className="text-white font-semibold mb-2">{summary.headline}</Text>
          <Text className="text-slate-300 text-sm">{summary.summary}</Text>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View className="px-4 -mt-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <View className="flex-row flex-wrap gap-3">
            <View className="items-center flex-1 min-w="80">
              <Text className="text-2xl font-bold text-slate-900">{quickStats.totalProducts}</Text>
              <Text className="text-xs text-slate-500">Products</Text>
            </View>
            <View className="items-center flex-1 min-w="80">
              <Text className={`text-2xl font-bold ${quickStats.criticalItems > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {quickStats.criticalItems}
              </Text>
              <Text className="text-xs text-slate-500">Critical</Text>
            </View>
            <View className="items-center flex-1 min-w="80">
              <Text className={`text-2xl font-bold ${quickStats.urgentReorders > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                {quickStats.urgentReorders}
              </Text>
              <Text className="text-xs text-slate-500">Urgent Reorders</Text>
            </View>
            <View className="items-center flex-1 min-w="80">
              <Text className="text-2xl font-bold text-emerald-600">${quickStats.potentialSavings.toLocaleString()}</Text>
              <Text className="text-xs text-slate-500">Potential Savings</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Key Metrics */}
      <View className="px-4 mt-4">
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <Text className="text-lg font-bold text-slate-900 mb-4">Key Metrics</Text>
          {summary.keyMetrics.map((metric, index) => (
            <View
              key={index}
              className="flex-row items-center justify-between py-3 border-b border-slate-100"
              style={{ borderBottomWidth: index === summary.keyMetrics.length - 1 ? 0 : 1 }}
            >
              <Text className="text-slate-600">{metric.label}</Text>
              <View className="flex-row items-center">
                <Text className="text-slate-900 font-semibold">{metric.value}</Text>
                {metric.change && (
                  <View
                    className={`ml-2 px-2 py-0.5 rounded-full ${
                      metric.change === "good" ? "bg-emerald-100" : 
                      metric.change === "warning" ? "bg-amber-100" : "bg-rose-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        metric.change === "good" ? "text-emerald-700" :
                        metric.change === "warning" ? "text-amber-700" : "text-rose-700"
                      }`}
                    >
                      {metric.change === "good" ? "↓" : metric.change === "warning" ? "!" : "↑"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Urgent Reorders */}
      {topReorders.length > 0 && (
        <View className="px-4 mt-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <RefreshCw size={20} color="#F97316" />
                <Text className="text-lg font-bold text-slate-900 ml-2">
                  Reorder Alerts
                </Text>
              </View>
              <Pressable onPress={() => router.push("/(tabs)/orders")}>
                <Text className="text-teal-600 font-medium text-sm">View All</Text>
              </Pressable>
            </View>

            {topReorders.slice(0, 3).map((reorder, index) => {
              const colors = urgencyColors[reorder.urgency];
              return (
                <Pressable
                  key={index}
                  className="flex-row items-center py-3 border-b border-slate-100 active:bg-slate-50"
                  style={{ borderBottomWidth: index === 2 ? 0 : 1 }}
                >
                  <View
                    className="w-2 h-10 rounded-full mr-3"
                    style={{ backgroundColor: colors.border }}
                  />
                  <View className="flex-1">
                    <Text className="text-slate-900 font-medium">
                      {reorder.productName}
                    </Text>
                    <Text className="text-slate-500 text-sm">
                      {reorder.suggestedQuantity} units • {reorder.daysRemaining} days left
                    </Text>
                  </View>
                  <View className="items-end">
                    <View
                      className="px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.text }}
                      >
                        {reorder.urgency}
                      </Text>
                    </View>
                    <Text className="text-slate-500 text-xs mt-1">
                      ${reorder.estimatedCost}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#94A3B8" className="ml-2" />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* AI Insights */}
      {topInsights.length > 0 && (
        <View className="px-4 mt-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center mb-4">
              <Brain size={20} color="#8B5CF6" />
              <Text className="text-lg font-bold text-slate-900 ml-2">
                AI Insights
              </Text>
            </View>

            {topInsights.map((insight, index) => {
              const colors = severityColors[insight.severity];
              return (
                <View
                  key={index}
                  className="flex-row items-start py-3 border-b border-slate-100"
                  style={{ borderBottomWidth: index === topInsights.length - 1 ? 0 : 1 }}
                >
                  <View
                    className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <AlertTriangle size={16} color={colors.text} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-medium">
                      {insight.insight}
                    </Text>
                    <Text className="text-slate-500 text-sm mt-1">
                      {insight.suggestion}
                    </Text>
                    {insight.potentialSavings && (
                      <Text className="text-emerald-600 text-sm mt-1 font-medium">
                        Potential savings: ${insight.potentialSavings}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Cost Optimization */}
      {topOptimizations.length > 0 && (
        <View className="px-4 mt-4 pb-8">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center mb-4">
              <DollarSign size={20} color="#10B981" />
              <Text className="text-lg font-bold text-slate-900 ml-2">
                Cost Optimization
              </Text>
            </View>

            {topOptimizations.map((opt, index) => (
              <View
                key={index}
                className="flex-row items-start py-3 border-b border-slate-100"
                style={{ borderBottomWidth: index === topOptimizations.length - 1 ? 0 : 1 }}
              >
                <View className="flex-1">
                  <Text className="text-slate-900 font-medium">{opt.category}</Text>
                  <Text className="text-slate-500 text-sm mt-1">
                    {opt.recommendation}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-emerald-600 font-bold">
                    +${opt.potentialSavings.toLocaleString()}
                  </Text>
                  <Text className="text-slate-500 text-xs">potential</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Generated Time */}
      <Text className="text-center text-slate-400 text-xs py-4">
        Last updated: {new Date(generatedAt).toLocaleString()}
      </Text>
    </ScrollView>
  );
}
