import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Trash2, Plus, X, ChevronLeft, Package } from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { GetLocationsResponse, GetMeResponse, GetProductsResponse } from "@/shared/contracts";
import { LinearGradient } from "expo-linear-gradient";

const wasteReasons = [
  { id: "SPOILED", label: "Spoiled", color: "#EF4444" },
  { id: "EXPIRED", label: "Expired", color: "#F97316" },
  { id: "DAMAGED", label: "Damaged", color: "#EAB308" },
  { id: "OVER-PRODUCED", label: "Over-produced", color: "#3B82F6" },
  { id: "OTHER", label: "Other", color: "#6B7280" },
];

export default function LogWasteScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

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

  const { data: productsData } = useQuery({
    queryKey: ["products", locationId],
    queryFn: () => api.get<GetProductsResponse>("/api/products"),
    enabled: !!locationId,
  });

  const logWasteMutation = useMutation({
    mutationFn: () =>
      api.post("/api/waste/log", {
        productId: selectedProductId,
        locationId,
        quantity: parseFloat(quantity),
        reason: selectedReason,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert(
        "Waste Logged",
        "The waste entry has been recorded successfully.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to log waste. Please try again.");
    },
  });

  const isOwner = meData?.membership?.role === "OWNER";
  const selectedProduct = productsData?.products.find((p) => p.id === selectedProductId);
  const selectedReasonData = wasteReasons.find((r) => r.id === selectedReason);

  const canSubmit =
    selectedProductId &&
    locationId &&
    quantity &&
    parseFloat(quantity) > 0 &&
    selectedReason;

  if (!session?.user || !meData?.membership) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-50"
    >
      {/* Header */}
      <LinearGradient
        colors={["#0F172A", "#1E3A5F"]}
        style={{
          paddingTop: 60,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-4 active:bg-white/20"
          >
            <ChevronLeft size={24} color="white" />
          </Pressable>
          <View>
            <Text className="text-white text-xl font-bold">Log Waste</Text>
            <Text className="text-slate-400 text-sm">
              Track wasted or spoiled items
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-5 pt-6">
        {/* Location Selector */}
        {locationsData && locationsData.locations.length > 1 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Location
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {locationsData.locations.map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => {
                    setSelectedLocationId(location.id);
                    setSelectedProductId(null);
                  }}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    locationId === location.id ? "bg-teal-600" : "bg-slate-200"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      locationId === location.id ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {location.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Product Selector */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Product
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#0D9488" />
          ) : (
            <View className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {productsData?.products.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => setSelectedProductId(product.id)}
                  className={`flex-row items-center justify-between p-4 border-b border-slate-100 active:bg-slate-50 ${
                    selectedProductId === product.id ? "bg-teal-50" : ""
                  }`}
                  style={{ borderBottomWidth: product.id === productsData.products[productsData.products.length - 1].id ? 0 : 1 }}
                >
                  <View className="flex-row items-center">
                    <Package size={18} color="#64748B" />
                    <View className="ml-3">
                      <Text className="text-slate-900 font-medium">
                        {product.name}
                      </Text>
                      {product.category && (
                        <Text className="text-slate-500 text-sm">
                          {product.category}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedProductId === product.id && (
                    <View className="w-6 h-6 rounded-full bg-teal-600 items-center justify-center">
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Quantity Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Quantity Wasted
          </Text>
          <TextInput
            value={quantity}
            onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ""))}
            placeholder="Enter quantity"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
          />
          {selectedProduct && (
            <Text className="text-xs text-slate-500 mt-2">
              Unit: {selectedProduct.unit}
            </Text>
          )}
        </View>

        {/* Reason Selector */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Reason
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {wasteReasons.map((reason) => (
              <Pressable
                key={reason.id}
                onPress={() => setSelectedReason(reason.id)}
                className={`px-4 py-2 rounded-full border ${
                  selectedReason === reason.id
                    ? "border-2"
                    : "border border-slate-200"
                }`}
                style={{
                  borderColor: selectedReason === reason.id ? reason.color : undefined,
                  backgroundColor:
                    selectedReason === reason.id ? `${reason.color}15` : "white",
                }}
              >
                <Text
                  className="font-medium text-sm"
                  style={{ color: reason.color }}
                >
                  {reason.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Notes (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional details..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
          />
        </View>

        {/* Cost Estimate */}
        {selectedProduct && quantity && parseFloat(quantity) > 0 && (
          <View className="bg-rose-50 rounded-xl p-4 mb-6 border border-rose-200">
            <View className="flex-row items-center mb-2">
              <Trash2 size={18} color="#EF4444" />
              <Text className="text-rose-700 font-semibold ml-2">
                Waste Summary
              </Text>
            </View>
            <Text className="text-slate-700">
              {parseFloat(quantity).toFixed(2)} {selectedProduct.unit} of{" "}
              {selectedProduct.name}
            </Text>
            {selectedReasonData && (
              <Text className="text-slate-500 text-sm mt-1">
                Reason: {selectedReasonData.label}
              </Text>
            )}
          </View>
        )}

        {/* Error Message */}
        {logWasteMutation.isError && (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <Text className="text-rose-700 text-sm">
              Failed to log waste. Please try again.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          onPress={() => {
            if (canSubmit) {
              Alert.alert(
                "Confirm Waste Entry",
                `Log ${quantity} ${selectedProduct?.unit} of ${selectedProduct?.name} as ${selectedReasonData?.label}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log Waste",
                    style: "destructive",
                    onPress: () => logWasteMutation.mutate(),
                  },
                ]
              );
            }
          }}
          disabled={!canSubmit || logWasteMutation.isPending}
          className={`rounded-xl py-4 flex-row items-center justify-center mb-8 ${
            canSubmit && !logWasteMutation.isPending
              ? "bg-rose-600 active:bg-rose-700"
              : "bg-slate-300"
          }`}
        >
          {logWasteMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Trash2 size={18} color="white" />
              <Text className="text-white font-semibold ml-2">
                Log Waste Entry
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
