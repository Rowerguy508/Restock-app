import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { X, Package, TrendingDown, Calendar } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type {
  GetStockResponse,
  GetMeResponse,
  StockLevel,
} from "@/shared/contracts";

export default function EditStockScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locationId, productId } = useLocalSearchParams<{
    locationId: string;
    productId: string;
  }>();
  const { data: session } = useSession();

  const [onHand, setOnHand] = useState("");
  const [dailyUsage, setDailyUsage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const { data: stockData, isLoading } = useQuery({
    queryKey: ["stock", locationId],
    queryFn: () => api.get<GetStockResponse>(`/api/stock/${locationId}`),
    enabled: !!locationId && !!meData?.membership,
  });

  const stockItem = stockData?.items.find((i) => i.product.id === productId);

  useEffect(() => {
    if (stockItem) {
      setOnHand(stockItem.stockLevel?.onHand.toString() ?? "0");
      setDailyUsage(stockItem.stockLevel?.dailyUsage.toString() ?? "0");
    }
  }, [stockItem]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put<StockLevel>(`/api/stock/${locationId}/${productId}`, {
        onHand: parseFloat(onHand) || 0,
        dailyUsage: parseFloat(dailyUsage) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock", locationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
    onError: () => {
      setError("Failed to update stock. Please try again.");
    },
  });

  const parsedOnHand = parseFloat(onHand) || 0;
  const parsedDailyUsage = parseFloat(dailyUsage) || 0;
  const daysRemaining =
    parsedDailyUsage > 0 ? Math.floor(parsedOnHand / parsedDailyUsage) : null;

  const canSubmit = parsedOnHand >= 0 && parsedDailyUsage >= 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  if (!stockItem) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Product not found</Text>
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
        <Text className="text-lg font-bold text-slate-900">Update Stock</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Product Info */}
        <View className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-teal-100 items-center justify-center">
              <Package size={24} color="#0D9488" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-slate-900 text-lg">
                {stockItem.product.name}
              </Text>
              <Text className="text-slate-500">
                {stockItem.product.category ?? "No category"} ·{" "}
                {stockItem.product.unit}
              </Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <Text className="text-rose-700 text-sm">{error}</Text>
          </View>
        )}

        {/* On Hand */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Package size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Current Stock (On Hand)
            </Text>
          </View>
          <View className="flex-row items-center">
            <TextInput
              value={onHand}
              onChangeText={(text) => {
                setOnHand(text);
                setError(null);
              }}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              keyboardType="decimal-pad"
            />
            <Text className="text-slate-500 ml-3 text-base">
              {stockItem.product.unit}
            </Text>
          </View>
        </View>

        {/* Daily Usage */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <TrendingDown size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Daily Usage (Average)
            </Text>
          </View>
          <View className="flex-row items-center">
            <TextInput
              value={dailyUsage}
              onChangeText={(text) => {
                setDailyUsage(text);
                setError(null);
              }}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              keyboardType="decimal-pad"
            />
            <Text className="text-slate-500 ml-3 text-base">
              {stockItem.product.unit}/day
            </Text>
          </View>
          <Text className="text-xs text-slate-500 mt-2">
            How much of this product do you use per day on average?
          </Text>
        </View>

        {/* Days Remaining Preview */}
        <View className="bg-slate-100 rounded-xl p-4 mb-8">
          <View className="flex-row items-center mb-2">
            <Calendar size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Days Remaining
            </Text>
          </View>
          <Text
            className={`text-3xl font-bold ${
              daysRemaining === null
                ? "text-slate-400"
                : daysRemaining <= 3
                  ? "text-rose-600"
                  : daysRemaining <= 7
                    ? "text-orange-500"
                    : "text-emerald-600"
            }`}
          >
            {daysRemaining !== null ? `${daysRemaining} days` : "N/A"}
          </Text>
          <Text className="text-xs text-slate-500 mt-1">
            {daysRemaining !== null
              ? daysRemaining <= 3
                ? "Critical - reorder soon!"
                : daysRemaining <= 7
                  ? "Getting low"
                  : "Stock is healthy"
              : "Set daily usage to calculate"}
          </Text>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={() => updateMutation.mutate()}
          disabled={!canSubmit || updateMutation.isPending}
          className={`rounded-xl py-4 items-center mb-8 ${
            canSubmit && !updateMutation.isPending
              ? "bg-teal-600 active:bg-teal-700"
              : "bg-slate-300"
          }`}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Update Stock
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
