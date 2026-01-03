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
import { ShoppingCart, Check, X, Truck } from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetOrdersResponse, GetMeResponse } from "@/shared/contracts";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "#F1F5F9", text: "#64748B", label: "Draft" },
  SENT: { bg: "#DBEAFE", text: "#2563EB", label: "Sent" },
  DELIVERED: { bg: "#D1FAE5", text: "#059669", label: "Delivered" },
  NOT_DELIVERED: { bg: "#FEE2E2", text: "#DC2626", label: "Failed" },
  CANCELLED: { bg: "#F1F5F9", text: "#94A3B8", label: "Cancelled" },
};

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const {
    data: ordersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<GetOrdersResponse>("/api/orders"),
    enabled: !!meData?.membership,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ orderId, delivered }: { orderId: string; delivered: boolean }) =>
      api.put(`/api/orders/${orderId}/confirm`, { delivered }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const isManager = meData?.membership?.role === "MANAGER";

  if (!session?.user || !meData?.membership) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Please sign in to view orders</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
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
        ) : ordersData?.orders.length === 0 ? (
          <View className="py-12 items-center px-6">
            <ShoppingCart size={48} color="#94A3B8" />
            <Text className="text-lg font-semibold text-slate-700 mt-4">
              No Orders Yet
            </Text>
            <Text className="text-slate-500 text-center mt-2">
              {isManager
                ? "Orders will appear here when sent by the owner."
                : "Create purchase orders to track deliveries."}
            </Text>
          </View>
        ) : (
          <View className="px-4 py-4">
            {ordersData?.orders.map((order) => {
              const status = statusConfig[order.status] ?? statusConfig.DRAFT;
              const canConfirm = order.status === "SENT";

              return (
                <View
                  key={order.id}
                  className="bg-white rounded-xl p-4 mb-3 border border-slate-100"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-base font-bold text-slate-900">
                        {order.orderNumber}
                      </Text>
                      <Text className="text-sm text-slate-500">
                        {order.supplier?.name ?? "Unknown Supplier"}
                      </Text>
                    </View>
                    <View
                      className="px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: status.bg }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: status.text }}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {order.location && (
                    <View className="flex-row items-center mb-3">
                      <Truck size={14} color="#64748B" />
                      <Text className="text-sm text-slate-500 ml-1">
                        {order.location.name}
                      </Text>
                    </View>
                  )}

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <View className="bg-slate-50 rounded-lg p-3 mb-3">
                      {order.items.slice(0, 3).map((item) => (
                        <View
                          key={item.id}
                          className="flex-row justify-between py-1"
                        >
                          <Text className="text-sm text-slate-700">
                            {item.product?.name ?? "Unknown Product"}
                          </Text>
                          <Text className="text-sm font-medium text-slate-900">
                            {item.quantity} {item.product?.unit ?? "units"}
                          </Text>
                        </View>
                      ))}
                      {order.items.length > 3 && (
                        <Text className="text-xs text-slate-500 mt-1">
                          +{order.items.length - 3} more items
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Confirm Delivery Buttons (Manager) */}
                  {canConfirm && (
                    <View className="flex-row gap-3 mt-2">
                      <Pressable
                        onPress={() =>
                          confirmMutation.mutate({
                            orderId: order.id,
                            delivered: true,
                          })
                        }
                        disabled={confirmMutation.isPending}
                        className="flex-1 bg-emerald-600 rounded-xl py-3 flex-row items-center justify-center active:bg-emerald-700"
                      >
                        <Check size={18} color="white" />
                        <Text className="text-white font-semibold ml-2">
                          Delivered
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          confirmMutation.mutate({
                            orderId: order.id,
                            delivered: false,
                          })
                        }
                        disabled={confirmMutation.isPending}
                        className="flex-1 bg-rose-600 rounded-xl py-3 flex-row items-center justify-center active:bg-rose-700"
                      >
                        <X size={18} color="white" />
                        <Text className="text-white font-semibold ml-2">
                          Not Delivered
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Order Date */}
                  <Text className="text-xs text-slate-400 mt-3">
                    Created{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
