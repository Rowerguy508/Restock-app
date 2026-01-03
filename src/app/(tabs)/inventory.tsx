import React, { useState } from "react";
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
import { Package, Plus, Edit3 } from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetStockResponse, GetLocationsResponse, GetMeResponse } from "@/shared/contracts";

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  OK: { bg: "#D1FAE5", text: "#059669", label: "In Stock" },
  LOW: { bg: "#FEF3C7", text: "#D97706", label: "Low" },
  CRITICAL: { bg: "#FFEDD5", text: "#EA580C", label: "Critical" },
  OUT: { bg: "#FEE2E2", text: "#DC2626", label: "Out" },
};

export default function InventoryScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

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

  const locationId = selectedLocationId ?? locationsData?.locations[0]?.id;

  const {
    data: stockData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["stock", locationId],
    queryFn: () => api.get<GetStockResponse>(`/api/stock/${locationId}`),
    enabled: !!locationId,
  });

  const isOwner = meData?.membership?.role === "OWNER";

  if (!session?.user || !meData?.membership) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Location Selector */}
      {locationsData && locationsData.locations.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="bg-white border-b border-slate-200 px-4 py-3"
          style={{ flexGrow: 0 }}
        >
          {locationsData.locations.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSelectedLocationId(location.id)}
              className={`px-4 py-2 rounded-full mr-2 ${
                locationId === location.id
                  ? "bg-teal-600"
                  : "bg-slate-100"
              }`}
            >
              <Text
                className={`font-medium ${
                  locationId === location.id
                    ? "text-white"
                    : "text-slate-600"
                }`}
              >
                {location.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Stock Summary */}
      {stockData && (
        <View className="flex-row justify-around bg-white px-4 py-4 border-b border-slate-200">
          <View className="items-center">
            <Text className="text-2xl font-bold text-emerald-600">
              {stockData.summary.ok}
            </Text>
            <Text className="text-xs text-slate-500">OK</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-amber-500">
              {stockData.summary.low}
            </Text>
            <Text className="text-xs text-slate-500">Low</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-orange-500">
              {stockData.summary.critical}
            </Text>
            <Text className="text-xs text-slate-500">Critical</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-rose-500">
              {stockData.summary.out}
            </Text>
            <Text className="text-xs text-slate-500">Out</Text>
          </View>
        </View>
      )}

      {/* Stock List */}
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
        ) : stockData?.items.length === 0 ? (
          <View className="py-12 items-center px-6">
            <Package size={48} color="#94A3B8" />
            <Text className="text-lg font-semibold text-slate-700 mt-4">
              No Products Yet
            </Text>
            <Text className="text-slate-500 text-center mt-2">
              Add products to start tracking inventory.
            </Text>
            {isOwner && (
              <Pressable
                onPress={() => router.push("/add-product")}
                className="bg-teal-600 rounded-xl px-6 py-3 mt-4 flex-row items-center active:bg-teal-700"
              >
                <Plus size={18} color="white" />
                <Text className="text-white font-semibold ml-2">Add Product</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="px-4 py-4">
            {stockData?.items.map((item) => {
              const status = statusColors[item.status] ?? statusColors.OK;
              return (
                <Pressable
                  key={item.product.id}
                  onPress={() => {
                    if (isOwner && locationId) {
                      router.push({
                        pathname: "/edit-stock",
                        params: { locationId, productId: item.product.id },
                      });
                    }
                  }}
                  disabled={!isOwner}
                  className="bg-white rounded-xl p-4 mb-3 border border-slate-100 active:bg-slate-50"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-slate-900">
                        {item.product.name}
                      </Text>
                      {item.product.category && (
                        <Text className="text-sm text-slate-500">
                          {item.product.category}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center">
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
                      {isOwner && (
                        <View className="ml-2">
                          <Edit3 size={16} color="#94A3B8" />
                        </View>
                      )}
                    </View>
                  </View>

                  <View className="flex-row mt-3 pt-3 border-t border-slate-100">
                    <View className="flex-1">
                      <Text className="text-xs text-slate-500">On Hand</Text>
                      <Text className="text-lg font-bold text-slate-900">
                        {item.stockLevel?.onHand.toFixed(1) ?? "0"}{" "}
                        <Text className="text-sm font-normal text-slate-500">
                          {item.product.unit}
                        </Text>
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-slate-500">Daily Usage</Text>
                      <Text className="text-lg font-bold text-slate-900">
                        {item.stockLevel?.dailyUsage.toFixed(1) ?? "0"}{" "}
                        <Text className="text-sm font-normal text-slate-500">
                          /day
                        </Text>
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-slate-500">Days Left</Text>
                      <Text
                        className="text-lg font-bold"
                        style={{ color: status.text }}
                      >
                        {item.daysRemaining !== null
                          ? item.daysRemaining.toFixed(1)
                          : "N/A"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {/* Add Product Button for Owner */}
            {isOwner && (
              <Pressable
                onPress={() => router.push("/add-product")}
                className="bg-white rounded-xl p-4 mb-3 border border-dashed border-slate-300 flex-row items-center justify-center active:bg-slate-50"
              >
                <Plus size={20} color="#0D9488" />
                <Text className="text-teal-600 font-semibold ml-2">
                  Add New Product
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
