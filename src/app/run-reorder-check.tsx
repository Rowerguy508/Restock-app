import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  X,
  Zap,
  AlertTriangle,
  FileText,
  Send,
  CheckCircle,
  MapPin,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetMeResponse, GetLocationsResponse } from "@/shared/contracts";

interface ReorderAction {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  daysRemaining: number | null;
  safetyDays: number;
  automationMode: string;
  action: string;
  orderId: string | null;
}

interface ReorderCheckResponse {
  actions: ReorderAction[];
  dryRun: boolean;
  summary: {
    locationsChecked: number;
    rulesChecked: number;
    actionsTriggered: number;
    alertsCreated: number;
    draftsCreated: number;
    ordersSent: number;
  };
}

const actionIcons: Record<string, typeof AlertTriangle> = {
  ALERT_CREATED: AlertTriangle,
  DRAFT_PO_CREATED: FileText,
  PO_SENT: Send,
  NO_ACTION: CheckCircle,
};

const actionColors: Record<string, { bg: string; text: string }> = {
  ALERT_CREATED: { bg: "#FEF3C7", text: "#D97706" },
  DRAFT_PO_CREATED: { bg: "#DBEAFE", text: "#2563EB" },
  PO_SENT: { bg: "#D1FAE5", text: "#059669" },
  NO_ACTION: { bg: "#F1F5F9", text: "#64748B" },
};

export default function RunReorderCheckScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [result, setResult] = useState<ReorderCheckResponse | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<GetLocationsResponse>("/api/locations"),
    enabled: !!meData?.membership,
  });

  const dryRunMutation = useMutation({
    mutationFn: () =>
      api.post<ReorderCheckResponse>("/api/reorder/check", {
        locationId: selectedLocationId || undefined,
        dryRun: true,
      }),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const executeMutation = useMutation({
    mutationFn: () =>
      api.post<ReorderCheckResponse>("/api/reorder/check", {
        locationId: selectedLocationId || undefined,
        dryRun: false,
      }),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const isOwner = meData?.membership?.role === "OWNER";

  if (!session?.user || !meData?.membership || !isOwner) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
        >
          <X size={22} color="#64748B" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">Reorder Check</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Location Filter */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <MapPin size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Location (Optional)
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            <Pressable
              onPress={() => setSelectedLocationId(null)}
              className={`px-4 py-2.5 rounded-full mr-2 ${
                selectedLocationId === null
                  ? "bg-teal-600"
                  : "bg-white border border-slate-200"
              }`}
            >
              <Text
                className={`font-medium ${
                  selectedLocationId === null ? "text-white" : "text-slate-600"
                }`}
              >
                All Locations
              </Text>
            </Pressable>
            {locationsData?.locations.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => setSelectedLocationId(location.id)}
                className={`px-4 py-2.5 rounded-full mr-2 ${
                  selectedLocationId === location.id
                    ? "bg-teal-600"
                    : "bg-white border border-slate-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedLocationId === location.id
                      ? "text-white"
                      : "text-slate-600"
                  }`}
                >
                  {location.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={() => dryRunMutation.mutate()}
            disabled={dryRunMutation.isPending || executeMutation.isPending}
            className="flex-1 bg-slate-200 rounded-xl py-4 items-center active:bg-slate-300"
          >
            {dryRunMutation.isPending ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <Text className="text-slate-700 font-semibold">Preview</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => executeMutation.mutate()}
            disabled={dryRunMutation.isPending || executeMutation.isPending}
            className="flex-1 bg-teal-600 rounded-xl py-4 items-center active:bg-teal-700"
          >
            {executeMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <View className="flex-row items-center">
                <Zap size={18} color="white" />
                <Text className="text-white font-semibold ml-2">Execute</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Results */}
        {result && (
          <View>
            {/* Summary */}
            <View className="bg-white rounded-xl p-4 mb-4 border border-slate-200">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-slate-900">Summary</Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    result.dryRun ? "bg-amber-100" : "bg-emerald-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      result.dryRun ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {result.dryRun ? "Preview" : "Executed"}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap">
                <View className="w-1/2 mb-3">
                  <Text className="text-xs text-slate-500">Locations Checked</Text>
                  <Text className="text-xl font-bold text-slate-900">
                    {result.summary.locationsChecked}
                  </Text>
                </View>
                <View className="w-1/2 mb-3">
                  <Text className="text-xs text-slate-500">Rules Checked</Text>
                  <Text className="text-xl font-bold text-slate-900">
                    {result.summary.rulesChecked}
                  </Text>
                </View>
                <View className="w-1/3">
                  <Text className="text-xs text-slate-500">Alerts</Text>
                  <Text className="text-xl font-bold text-amber-600">
                    {result.summary.alertsCreated}
                  </Text>
                </View>
                <View className="w-1/3">
                  <Text className="text-xs text-slate-500">Drafts</Text>
                  <Text className="text-xl font-bold text-blue-600">
                    {result.summary.draftsCreated}
                  </Text>
                </View>
                <View className="w-1/3">
                  <Text className="text-xs text-slate-500">Sent</Text>
                  <Text className="text-xl font-bold text-emerald-600">
                    {result.summary.ordersSent}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions List */}
            {result.actions.length > 0 ? (
              <View className="mb-8">
                <Text className="text-sm font-semibold text-slate-500 uppercase mb-3">
                  Actions ({result.actions.length})
                </Text>
                {result.actions.map((action, index) => {
                  const Icon = actionIcons[action.action] ?? CheckCircle;
                  const colors = actionColors[action.action] ?? actionColors.NO_ACTION;
                  return (
                    <View
                      key={`${action.productId}-${action.locationId}-${index}`}
                      className="bg-white rounded-xl p-4 mb-2 border border-slate-200"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="font-semibold text-slate-900 flex-1">
                          {action.productName}
                        </Text>
                        <View
                          className="px-2 py-1 rounded-lg flex-row items-center"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <Icon size={14} color={colors.text} />
                          <Text
                            className="text-xs font-semibold ml-1"
                            style={{ color: colors.text }}
                          >
                            {action.action.replace(/_/g, " ")}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm text-slate-500 mb-1">
                        {action.locationName}
                      </Text>
                      <View className="flex-row">
                        <Text className="text-xs text-slate-500">
                          {action.daysRemaining !== null
                            ? `${action.daysRemaining} days remaining`
                            : "No usage data"}{" "}
                          · Safety: {action.safetyDays} days · Mode:{" "}
                          {action.automationMode}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-6 mb-8 border border-slate-200 items-center">
                <CheckCircle size={48} color="#10B981" />
                <Text className="text-lg font-semibold text-slate-900 mt-4">
                  All Good!
                </Text>
                <Text className="text-slate-500 text-center mt-2">
                  No products need reordering at this time.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Initial State */}
        {!result && !dryRunMutation.isPending && !executeMutation.isPending && (
          <View className="bg-white rounded-xl p-6 border border-slate-200 items-center">
            <Zap size={48} color="#0D9488" />
            <Text className="text-lg font-semibold text-slate-900 mt-4">
              Check Your Inventory
            </Text>
            <Text className="text-slate-500 text-center mt-2">
              Run a check to see which products need reordering based on your rules.
            </Text>
            <Text className="text-slate-400 text-center text-sm mt-2">
              Use "Preview" to see what would happen without making changes.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
