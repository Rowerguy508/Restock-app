import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle, Package, Truck, X } from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetAlertsResponse, GetMeResponse } from "@/shared/contracts";

const severityConfig: Record<string, { bg: string; border: string; icon: string }> = {
  INFO: { bg: "#F0F9FF", border: "#BAE6FD", icon: "#0284C7" },
  WARN: { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706" },
  CRIT: { bg: "#FEF2F2", border: "#FECACA", icon: "#DC2626" },
};

const typeIcons: Record<string, typeof AlertTriangle> = {
  LOW_STOCK: Package,
  DRAFT_PO_PENDING: Truck,
  EMERGENCY_REORDER: AlertTriangle,
  DELIVERY_NOT_CONFIRMED: Truck,
  DELIVERY_FAILED: AlertTriangle,
};

export default function AlertsScreen() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const {
    data: alertsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get<GetAlertsResponse>("/api/alerts"),
    enabled: !!meData?.membership,
    refetchInterval: 30000,
  });

  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => api.put(`/api/alerts/${alertId}/dismiss`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (alertId: string) => api.put(`/api/alerts/${alertId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const isOwner = meData?.membership?.role === "OWNER";

  if (!session?.user || !meData?.membership) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Please sign in to view alerts</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Unread Count */}
      {alertsData && alertsData.unreadCount > 0 && (
        <View className="bg-rose-50 px-4 py-3 border-b border-rose-100">
          <Text className="text-rose-700 font-medium">
            {alertsData.unreadCount} unread alert
            {alertsData.unreadCount > 1 ? "s" : ""}
          </Text>
        </View>
      )}

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
        ) : alertsData?.alerts.length === 0 ? (
          <View className="py-12 items-center px-6">
            <Bell size={48} color="#94A3B8" />
            <Text className="text-lg font-semibold text-slate-700 mt-4">
              No Alerts
            </Text>
            <Text className="text-slate-500 text-center mt-2">
              You're all caught up! No alerts at the moment.
            </Text>
          </View>
        ) : (
          <View className="px-4 py-4">
            {alertsData?.alerts.map((alert) => {
              const severity = severityConfig[alert.severity] ?? severityConfig.INFO;
              const IconComponent = typeIcons[alert.type] ?? AlertTriangle;

              return (
                <Pressable
                  key={alert.id}
                  onPress={() => {
                    if (!alert.isRead) {
                      markReadMutation.mutate(alert.id);
                    }
                  }}
                  className="rounded-xl p-4 mb-3 border"
                  style={{
                    backgroundColor: severity.bg,
                    borderColor: severity.border,
                    opacity: alert.isRead ? 0.7 : 1,
                  }}
                >
                  <View className="flex-row items-start">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${severity.icon}20` }}
                    >
                      <IconComponent size={20} color={severity.icon} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="text-base font-semibold text-slate-900 flex-1"
                          numberOfLines={1}
                        >
                          {alert.title}
                        </Text>
                        {isOwner && (
                          <Pressable
                            onPress={() => dismissMutation.mutate(alert.id)}
                            className="p-1 ml-2"
                          >
                            <X size={16} color="#94A3B8" />
                          </Pressable>
                        )}
                      </View>
                      <Text className="text-sm text-slate-600 mt-1">
                        {alert.message}
                      </Text>
                      <View className="flex-row items-center mt-2">
                        {alert.location && (
                          <Text className="text-xs text-slate-500 mr-3">
                            {alert.location.name}
                          </Text>
                        )}
                        <Text className="text-xs text-slate-400">
                          {new Date(alert.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </Text>
                        {!alert.isRead && (
                          <View className="w-2 h-2 rounded-full bg-teal-500 ml-2" />
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
