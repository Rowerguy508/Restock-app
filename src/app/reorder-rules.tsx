import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Settings2,
  Plus,
  Zap,
  AlertTriangle,
  Edit3,
  Trash2,
  Package,
  Truck,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetReorderRulesResponse, GetMeResponse } from "@/shared/contracts";

const automationModeColors: Record<string, { bg: string; text: string; label: string }> = {
  MANUAL: { bg: "#F1F5F9", text: "#64748B", label: "Manual" },
  ASSISTED: { bg: "#DBEAFE", text: "#2563EB", label: "Assisted" },
  AUTO: { bg: "#D1FAE5", text: "#059669", label: "Auto" },
  EMERGENCY: { bg: "#FEE2E2", text: "#DC2626", label: "Emergency" },
};

export default function ReorderRulesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const {
    data: rulesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["reorder-rules"],
    queryFn: () => api.get<GetReorderRulesResponse>("/api/reorder-rules"),
    enabled: !!meData?.membership && meData.membership.role === "OWNER",
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => api.delete(`/api/reorder-rules/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
    },
  });

  const isOwner = meData?.membership?.role === "OWNER";

  if (!session?.user || !meData?.membership) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  if (!isOwner) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Settings2 size={48} color="#94A3B8" />
        <Text className="text-lg font-semibold text-slate-700 mt-4">
          Owner Access Required
        </Text>
        <Text className="text-slate-500 text-center mt-2">
          Only owners can manage reorder rules.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <View>
          <Text className="text-xl font-bold text-slate-900">Reorder Rules</Text>
          <Text className="text-sm text-slate-500">Automation settings</Text>
        </View>
        <Pressable
          onPress={() => router.push("/add-reorder-rule")}
          className="flex-row items-center bg-teal-600 rounded-xl px-4 py-2.5 active:bg-teal-700"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-semibold ml-1.5">Add Rule</Text>
        </Pressable>
      </View>

      {/* Info Banner */}
      <View className="mx-4 mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
        <View className="flex-row items-start">
          <Zap size={20} color="#2563EB" />
          <View className="ml-3 flex-1">
            <Text className="text-blue-800 font-semibold">How it works</Text>
            <Text className="text-blue-700 text-sm mt-1">
              Rules automatically check stock levels. When days remaining falls below your safety threshold, the system takes action based on the mode you choose.
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#0D9488"
          />
        }
      >
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#0D9488" />
          </View>
        ) : rulesData?.rules.length === 0 ? (
          <View className="py-12 items-center px-6">
            <Settings2 size={48} color="#94A3B8" />
            <Text className="text-lg font-semibold text-slate-700 mt-4">
              No Reorder Rules
            </Text>
            <Text className="text-slate-500 text-center mt-2">
              Create rules to automate your replenishment process.
            </Text>
            <Pressable
              onPress={() => router.push("/add-reorder-rule")}
              className="bg-teal-600 rounded-xl px-6 py-3 mt-4 flex-row items-center active:bg-teal-700"
            >
              <Plus size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Create First Rule</Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-4 py-4">
            {rulesData?.rules.map((rule) => {
              const mode = automationModeColors[rule.automationMode] ?? automationModeColors.MANUAL;
              return (
                <View
                  key={rule.id}
                  className="bg-white rounded-xl p-4 mb-3 border border-slate-100"
                >
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-slate-900">
                        {rule.product.name}
                      </Text>
                      <Text className="text-sm text-slate-500">
                        {rule.product.category ?? "No category"}
                      </Text>
                    </View>
                    <View
                      className="px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: mode.bg }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: mode.text }}
                      >
                        {mode.label}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View className="flex-row bg-slate-50 rounded-lg p-3 mb-3">
                    <View className="flex-1">
                      <Text className="text-xs text-slate-500">Safety Days</Text>
                      <Text className="text-base font-bold text-slate-900">
                        {rule.safetyDays} days
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-slate-500">Reorder Qty</Text>
                      <Text className="text-base font-bold text-slate-900">
                        {rule.reorderQty} {rule.product.unit}
                      </Text>
                    </View>
                    {rule.priceCap && (
                      <View className="flex-1">
                        <Text className="text-xs text-slate-500">Max Price</Text>
                        <Text className="text-base font-bold text-slate-900">
                          ${rule.priceCap.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Supplier */}
                  <View className="flex-row items-center mb-3">
                    <Truck size={14} color="#64748B" />
                    <Text className="text-sm text-slate-600 ml-2">
                      From: {rule.supplier.name}
                    </Text>
                  </View>

                  {/* Status and Actions */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                    <View className="flex-row items-center">
                      <View
                        className={`w-2 h-2 rounded-full mr-2 ${
                          rule.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <Text className="text-sm text-slate-600">
                        {rule.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                    <View className="flex-row">
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/edit-reorder-rule",
                            params: { ruleId: rule.id },
                          })
                        }
                        className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center mr-2 active:bg-slate-200"
                      >
                        <Edit3 size={16} color="#64748B" />
                      </Pressable>
                      <Pressable
                        onPress={() => deleteMutation.mutate(rule.id)}
                        disabled={deleteMutation.isPending}
                        className="w-9 h-9 rounded-lg bg-rose-100 items-center justify-center active:bg-rose-200"
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Run Check Button */}
            <Pressable
              onPress={() => router.push("/run-reorder-check")}
              className="bg-slate-900 rounded-xl p-4 mt-4 flex-row items-center justify-center active:bg-slate-800"
            >
              <Zap size={20} color="white" />
              <Text className="text-white font-semibold ml-2">
                Run Reorder Check
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
