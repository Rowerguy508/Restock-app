import React from "react";
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
import { AlertTriangle, Package, ShoppingCart, TrendingUp, ChevronRight } from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetDashboardResponse, GetMeResponse } from "@/shared/contracts";
import { LinearGradient } from "expo-linear-gradient";

function StatusCard({
  title,
  value,
  icon: Icon,
  color,
  onPress,
}: {
  title: string;
  value: number;
  icon: typeof Package;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
      style={{ minWidth: "45%" }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={20} color={color} />
        </View>
        <ChevronRight size={16} color="#94A3B8" />
      </View>
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="text-sm text-slate-500 mt-1">{title}</Text>
    </Pressable>
  );
}

function StockStatusBar({
  ok,
  low,
  critical,
  out,
}: {
  ok: number;
  low: number;
  critical: number;
  out: number;
}) {
  const total = ok + low + critical + out;
  if (total === 0) return null;

  return (
    <View className="flex-row h-3 rounded-full overflow-hidden bg-slate-100">
      {ok > 0 && (
        <View
          className="h-full bg-emerald-500"
          style={{ width: `${(ok / total) * 100}%` }}
        />
      )}
      {low > 0 && (
        <View
          className="h-full bg-amber-400"
          style={{ width: `${(low / total) * 100}%` }}
        />
      )}
      {critical > 0 && (
        <View
          className="h-full bg-orange-500"
          style={{ width: `${(critical / total) * 100}%` }}
        />
      )}
      {out > 0 && (
        <View
          className="h-full bg-rose-500"
          style={{ width: `${(out / total) * 100}%` }}
        />
      )}
    </View>
  );
}

function CriticalItemRow({
  name,
  daysRemaining,
  status,
}: {
  name: string;
  daysRemaining: number | null;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    OK: "#10B981",
    LOW: "#F59E0B",
    CRITICAL: "#F97316",
    OUT: "#EF4444",
  };

  return (
    <View className="flex-row items-center py-3 border-b border-slate-100">
      <View
        className="w-2 h-2 rounded-full mr-3"
        style={{ backgroundColor: statusColors[status] ?? "#94A3B8" }}
      />
      <Text className="flex-1 text-slate-800 font-medium" numberOfLines={1}>
        {name}
      </Text>
      <Text
        className="text-sm font-semibold"
        style={{ color: statusColors[status] ?? "#94A3B8" }}
      >
        {status === "OUT"
          ? "OUT"
          : daysRemaining !== null
            ? `${daysRemaining}d`
            : "N/A"}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<GetDashboardResponse>("/api/dashboard"),
    enabled: !!meData?.membership,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Show loading state while data loads
  if (meLoading || !meData?.membership) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const isOwner = meData.membership.role === "OWNER";

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#0D9488"
        />
      }
    >
      {/* Header Section */}
      <LinearGradient
        colors={["#0F172A", "#1E3A5F"]}
        style={{
          paddingTop: 16,
          paddingBottom: 32,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-slate-400 text-sm">
              {isOwner ? "Owner" : "Manager"}
            </Text>
            <Text className="text-white text-xl font-bold">
              {meData.organization?.name ?? "My Restaurant"}
            </Text>
          </View>
          {meData.location && (
            <View className="bg-white/10 rounded-lg px-3 py-1.5">
              <Text className="text-white text-sm">{meData.location.name}</Text>
            </View>
          )}
        </View>

        {/* Stock Status Overview */}
        <View className="bg-white/10 rounded-2xl p-4 mt-2">
          <Text className="text-white font-semibold mb-3">Stock Status</Text>
          <StockStatusBar
            ok={dashboard?.stockSummary.ok ?? 0}
            low={dashboard?.stockSummary.low ?? 0}
            critical={dashboard?.stockSummary.critical ?? 0}
            out={dashboard?.stockSummary.out ?? 0}
          />
          <View className="flex-row justify-between mt-3">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1" />
              <Text className="text-slate-300 text-xs">
                OK ({dashboard?.stockSummary.ok ?? 0})
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-amber-400 mr-1" />
              <Text className="text-slate-300 text-xs">
                Low ({dashboard?.stockSummary.low ?? 0})
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
              <Text className="text-slate-300 text-xs">
                Critical ({dashboard?.stockSummary.critical ?? 0})
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-rose-500 mr-1" />
              <Text className="text-slate-300 text-xs">
                Out ({dashboard?.stockSummary.out ?? 0})
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View className="px-5 -mt-4">
        <View className="flex-row gap-3">
          <StatusCard
            title="Active Alerts"
            value={dashboard?.activeAlerts ?? 0}
            icon={AlertTriangle}
            color="#EF4444"
            onPress={() => router.push("/(tabs)/alerts")}
          />
          <StatusCard
            title="Pending Orders"
            value={dashboard?.pendingOrders ?? 0}
            icon={ShoppingCart}
            color="#0D9488"
            onPress={() => router.push("/(tabs)/orders")}
          />
        </View>
      </View>

      {/* Critical Items */}
      {dashboard?.criticalItems && dashboard.criticalItems.length > 0 && (
        <View className="px-5 mt-6">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-slate-900">
                Attention Needed
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/inventory")}>
                <Text className="text-teal-600 font-medium text-sm">
                  View All
                </Text>
              </Pressable>
            </View>
            {dashboard.criticalItems.slice(0, 5).map((item) => (
              <CriticalItemRow
                key={item.product.id}
                name={item.product.name}
                daysRemaining={item.daysRemaining}
                status={item.status}
              />
            ))}
          </View>
        </View>
      )}

      {/* Recent Orders */}
      {dashboard?.recentOrders && dashboard.recentOrders.length > 0 && (
        <View className="px-5 mt-6 mb-8">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-slate-900">
                Recent Orders
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/orders")}>
                <Text className="text-teal-600 font-medium text-sm">
                  View All
                </Text>
              </Pressable>
            </View>
            {dashboard.recentOrders.slice(0, 3).map((order) => (
              <View
                key={order.id}
                className="flex-row items-center py-3 border-b border-slate-100"
              >
                <View className="flex-1">
                  <Text className="text-slate-800 font-medium">
                    {order.orderNumber}
                  </Text>
                  <Text className="text-slate-500 text-sm">
                    {order.supplier?.name ?? "Unknown Supplier"}
                  </Text>
                </View>
                <View
                  className="px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor:
                      order.status === "DELIVERED"
                        ? "#D1FAE5"
                        : order.status === "SENT"
                          ? "#DBEAFE"
                          : order.status === "NOT_DELIVERED"
                            ? "#FEE2E2"
                            : "#F1F5F9",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        order.status === "DELIVERED"
                          ? "#059669"
                          : order.status === "SENT"
                            ? "#2563EB"
                            : order.status === "NOT_DELIVERED"
                              ? "#DC2626"
                              : "#64748B",
                    }}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty state when no data */}
      {dashboardLoading && (
        <View className="px-5 mt-6">
          <ActivityIndicator size="small" color="#0D9488" />
        </View>
      )}

      {!dashboardLoading &&
        (!dashboard?.criticalItems?.length && !dashboard?.recentOrders?.length) && (
          <View className="px-5 mt-6 mb-8">
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 items-center">
              <TrendingUp size={48} color="#0D9488" />
              <Text className="text-lg font-bold text-slate-900 mt-4">
                All Systems Go!
              </Text>
              <Text className="text-slate-500 text-center mt-2">
                Your inventory is looking good. No critical items or pending
                orders at the moment.
              </Text>
            </View>
          </View>
        )}
    </ScrollView>
  );
}
