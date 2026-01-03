import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { X, Package, Truck, Calendar, Hash, Zap } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type {
  GetProductsResponse,
  GetSuppliersResponse,
  GetMeResponse,
} from "@/shared/contracts";

const AUTOMATION_MODES = [
  { value: "MANUAL", label: "Manual", desc: "Creates alerts only" },
  { value: "ASSISTED", label: "Assisted", desc: "Creates draft POs for review" },
  { value: "AUTO", label: "Auto", desc: "Sends POs automatically" },
  { value: "EMERGENCY", label: "Emergency", desc: "Immediate PO + critical alert" },
];

export default function AddReorderRuleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [productId, setProductId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [safetyDays, setSafetyDays] = useState("3");
  const [reorderQty, setReorderQty] = useState("1");
  const [automationMode, setAutomationMode] = useState("MANUAL");
  const [priceCap, setPriceCap] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<GetProductsResponse>("/api/products"),
    enabled: !!meData?.membership,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<GetSuppliersResponse>("/api/suppliers"),
    enabled: !!meData?.membership,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/api/reorder-rules", {
        productId,
        supplierId,
        safetyDays: parseInt(safetyDays) || 3,
        reorderQty: parseFloat(reorderQty) || 1,
        automationMode,
        priceCap: priceCap ? parseFloat(priceCap) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create rule. Please try again.");
    },
  });

  const selectedProduct = productsData?.products.find((p) => p.id === productId);
  const canSubmit = productId && supplierId && parseInt(safetyDays) > 0 && parseFloat(reorderQty) > 0;

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
        <Text className="text-lg font-bold text-slate-900">Add Reorder Rule</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Error Message */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <Text className="text-rose-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Product Selection */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Package size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Product *
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-1"
            style={{ flexGrow: 0 }}
          >
            {productsData?.products.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => setProductId(product.id)}
                className={`px-4 py-2.5 rounded-full mr-2 ${
                  productId === product.id
                    ? "bg-teal-600"
                    : "bg-white border border-slate-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    productId === product.id ? "text-white" : "text-slate-600"
                  }`}
                >
                  {product.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Supplier Selection */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Truck size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Supplier *
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-1"
            style={{ flexGrow: 0 }}
          >
            {suppliersData?.suppliers.map((supplier) => (
              <Pressable
                key={supplier.id}
                onPress={() => setSupplierId(supplier.id)}
                className={`px-4 py-2.5 rounded-full mr-2 ${
                  supplierId === supplier.id
                    ? "bg-teal-600"
                    : "bg-white border border-slate-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    supplierId === supplier.id ? "text-white" : "text-slate-600"
                  }`}
                >
                  {supplier.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Safety Days */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Calendar size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Safety Days *
            </Text>
          </View>
          <TextInput
            value={safetyDays}
            onChangeText={setSafetyDays}
            placeholder="3"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            keyboardType="number-pad"
          />
          <Text className="text-xs text-slate-500 mt-2">
            Trigger reorder when stock falls below this many days of supply.
          </Text>
        </View>

        {/* Reorder Quantity */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Hash size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Reorder Quantity *
            </Text>
          </View>
          <View className="flex-row items-center">
            <TextInput
              value={reorderQty}
              onChangeText={setReorderQty}
              placeholder="1"
              placeholderTextColor="#94A3B8"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              keyboardType="decimal-pad"
            />
            <Text className="text-slate-500 ml-3">
              {selectedProduct?.unit ?? "units"}
            </Text>
          </View>
        </View>

        {/* Price Cap (Optional) */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Max Price per Unit (Optional)
          </Text>
          <View className="flex-row items-center">
            <Text className="text-slate-500 mr-2">$</Text>
            <TextInput
              value={priceCap}
              onChangeText={setPriceCap}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Automation Mode */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <Zap size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Automation Mode
            </Text>
          </View>
          {AUTOMATION_MODES.map((mode) => (
            <Pressable
              key={mode.value}
              onPress={() => setAutomationMode(mode.value)}
              className={`flex-row items-center p-4 rounded-xl mb-2 border ${
                automationMode === mode.value
                  ? "bg-teal-50 border-teal-300"
                  : "bg-white border-slate-200"
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                  automationMode === mode.value
                    ? "border-teal-600"
                    : "border-slate-300"
                }`}
              >
                {automationMode === mode.value && (
                  <View className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`font-semibold ${
                    automationMode === mode.value
                      ? "text-teal-900"
                      : "text-slate-900"
                  }`}
                >
                  {mode.label}
                </Text>
                <Text className="text-sm text-slate-500">{mode.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          className={`rounded-xl py-4 items-center mb-8 ${
            canSubmit && !createMutation.isPending
              ? "bg-teal-600 active:bg-teal-700"
              : "bg-slate-300"
          }`}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Create Rule
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
