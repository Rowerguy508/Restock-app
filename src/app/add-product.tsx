import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { X, Package, Tag, Layers, Archive } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import type { Product } from "@/shared/contracts";

const CATEGORIES = [
  "Produce",
  "Meat",
  "Seafood",
  "Dairy",
  "Beverages",
  "Dry Goods",
  "Frozen",
  "Cleaning",
  "Other",
];

const UNITS = ["unit", "kg", "lb", "liter", "gallon", "case", "box", "bag"];

export default function AddProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("unit");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Product>("/api/products", {
        name,
        sku: sku || undefined,
        unit,
        category: category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      router.back();
    },
    onError: () => {
      setError("Failed to create product. Please try again.");
    },
  });

  const canSubmit = name.trim().length > 0;

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
        <Text className="text-lg font-bold text-slate-900">Add Product</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Error Message */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <Text className="text-rose-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Product Name */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Package size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Product Name *
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="e.g., Tomatoes"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            autoCapitalize="words"
          />
        </View>

        {/* SKU */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Tag size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              SKU (Optional)
            </Text>
          </View>
          <TextInput
            value={sku}
            onChangeText={setSku}
            placeholder="e.g., TOM-001"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            autoCapitalize="characters"
          />
        </View>

        {/* Unit */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Layers size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Unit of Measure
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-1"
            style={{ flexGrow: 0 }}
          >
            {UNITS.map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                className={`px-4 py-2.5 rounded-full mr-2 ${
                  unit === u ? "bg-teal-600" : "bg-white border border-slate-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    unit === u ? "text-white" : "text-slate-600"
                  }`}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Category */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <Archive size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Category (Optional)
            </Text>
          </View>
          <View className="flex-row flex-wrap">
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(category === c ? "" : c)}
                className={`px-4 py-2.5 rounded-full mr-2 mb-2 ${
                  category === c
                    ? "bg-teal-600"
                    : "bg-white border border-slate-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    category === c ? "text-white" : "text-slate-600"
                  }`}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
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
              Add Product
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
