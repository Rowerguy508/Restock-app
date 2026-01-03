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
import {
  X,
  MapPin,
  Truck,
  Package,
  Plus,
  Minus,
  Trash2,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type {
  GetLocationsResponse,
  GetSuppliersResponse,
  GetProductsResponse,
  PurchaseOrder,
  GetMeResponse,
} from "@/shared/contracts";

interface OrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
}

export default function CreateOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"location" | "supplier" | "items" | "review">("location");

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

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<GetSuppliersResponse>("/api/suppliers"),
    enabled: !!meData?.membership,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<GetProductsResponse>("/api/products"),
    enabled: !!meData?.membership,
  });

  const createMutation = useMutation({
    mutationFn: (sendImmediately: boolean) =>
      api.post<PurchaseOrder>("/api/orders", {
        locationId: selectedLocationId,
        supplierId: selectedSupplierId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
        sendImmediately,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
    onError: () => {
      setError("Failed to create order. Please try again.");
    },
  });

  const addItem = (product: { id: string; name: string; unit: string }) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(
      items
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const selectedLocation = locationsData?.locations.find(
    (l) => l.id === selectedLocationId
  );
  const selectedSupplier = suppliersData?.suppliers.find(
    (s) => s.id === selectedSupplierId
  );

  const canProceedToSupplier = !!selectedLocationId;
  const canProceedToItems = !!selectedSupplierId;
  const canProceedToReview = items.length > 0;
  const canSubmit = selectedLocationId && selectedSupplierId && items.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <Pressable
          onPress={() => {
            if (step === "location") {
              router.back();
            } else if (step === "supplier") {
              setStep("location");
            } else if (step === "items") {
              setStep("supplier");
            } else {
              setStep("items");
            }
          }}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
        >
          <X size={22} color="#64748B" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">
          {step === "location" && "Select Location"}
          {step === "supplier" && "Select Supplier"}
          {step === "items" && "Add Items"}
          {step === "review" && "Review Order"}
        </Text>
        <View className="w-10" />
      </View>

      {/* Progress */}
      <View className="flex-row px-4 py-3 bg-white border-b border-slate-100">
        {["location", "supplier", "items", "review"].map((s, i) => (
          <View key={s} className="flex-1 flex-row items-center">
            <View
              className={`w-6 h-6 rounded-full items-center justify-center ${
                step === s
                  ? "bg-teal-600"
                  : ["location", "supplier", "items", "review"].indexOf(step) > i
                    ? "bg-teal-200"
                    : "bg-slate-200"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  step === s ? "text-white" : "text-slate-500"
                }`}
              >
                {i + 1}
              </Text>
            </View>
            {i < 3 && (
              <View
                className={`flex-1 h-0.5 mx-1 ${
                  ["location", "supplier", "items", "review"].indexOf(step) > i
                    ? "bg-teal-200"
                    : "bg-slate-200"
                }`}
              />
            )}
          </View>
        ))}
      </View>

      {error && (
        <View className="mx-4 mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <Text className="text-rose-700 text-sm">{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1">
        {/* Step 1: Location */}
        {step === "location" && (
          <View className="px-4 pt-4">
            <Text className="text-sm text-slate-500 mb-4">
              Select the location for this order
            </Text>
            {locationsData?.locations.map((location) => (
              <Pressable
                key={location.id}
                onPress={() => setSelectedLocationId(location.id)}
                className={`flex-row items-center p-4 rounded-xl mb-3 border ${
                  selectedLocationId === location.id
                    ? "bg-teal-50 border-teal-300"
                    : "bg-white border-slate-200"
                }`}
              >
                <MapPin
                  size={20}
                  color={selectedLocationId === location.id ? "#0D9488" : "#64748B"}
                />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-slate-900">
                    {location.name}
                  </Text>
                  {location.address && (
                    <Text className="text-sm text-slate-500">{location.address}</Text>
                  )}
                </View>
              </Pressable>
            ))}

            <Pressable
              onPress={() => canProceedToSupplier && setStep("supplier")}
              disabled={!canProceedToSupplier}
              className={`rounded-xl py-4 items-center mt-4 ${
                canProceedToSupplier
                  ? "bg-teal-600 active:bg-teal-700"
                  : "bg-slate-300"
              }`}
            >
              <Text className="text-white font-semibold">Continue</Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Supplier */}
        {step === "supplier" && (
          <View className="px-4 pt-4">
            <Text className="text-sm text-slate-500 mb-4">
              Select the supplier for this order
            </Text>
            {suppliersData?.suppliers.length === 0 ? (
              <View className="items-center py-8">
                <Truck size={48} color="#94A3B8" />
                <Text className="text-slate-700 font-semibold mt-4">No Suppliers</Text>
                <Text className="text-slate-500 text-center mt-2">
                  Add suppliers first before creating orders.
                </Text>
                <Pressable
                  onPress={() => router.push("/add-supplier")}
                  className="bg-teal-600 rounded-xl px-6 py-3 mt-4"
                >
                  <Text className="text-white font-semibold">Add Supplier</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {suppliersData?.suppliers.map((supplier) => (
                  <Pressable
                    key={supplier.id}
                    onPress={() => setSelectedSupplierId(supplier.id)}
                    className={`flex-row items-center p-4 rounded-xl mb-3 border ${
                      selectedSupplierId === supplier.id
                        ? "bg-teal-50 border-teal-300"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <Truck
                      size={20}
                      color={selectedSupplierId === supplier.id ? "#0D9488" : "#64748B"}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="font-semibold text-slate-900">
                        {supplier.name}
                      </Text>
                      {supplier.contactName && (
                        <Text className="text-sm text-slate-500">
                          {supplier.contactName}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}

                <Pressable
                  onPress={() => canProceedToItems && setStep("items")}
                  disabled={!canProceedToItems}
                  className={`rounded-xl py-4 items-center mt-4 ${
                    canProceedToItems
                      ? "bg-teal-600 active:bg-teal-700"
                      : "bg-slate-300"
                  }`}
                >
                  <Text className="text-white font-semibold">Continue</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Step 3: Items */}
        {step === "items" && (
          <View className="px-4 pt-4">
            {/* Selected items */}
            {items.length > 0 && (
              <View className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                <Text className="font-semibold text-slate-900 mb-3">
                  Order Items ({items.length})
                </Text>
                {items.map((item) => (
                  <View
                    key={item.productId}
                    className="flex-row items-center py-2 border-b border-slate-100"
                  >
                    <View className="flex-1">
                      <Text className="font-medium text-slate-900">
                        {item.productName}
                      </Text>
                      <Text className="text-sm text-slate-500">{item.unit}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => updateQuantity(item.productId, -1)}
                        className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                      >
                        <Minus size={16} color="#64748B" />
                      </Pressable>
                      <Text className="mx-3 font-bold text-slate-900 w-8 text-center">
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateQuantity(item.productId, 1)}
                        className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                      >
                        <Plus size={16} color="#64748B" />
                      </Pressable>
                      <Pressable
                        onPress={() => removeItem(item.productId)}
                        className="w-8 h-8 rounded-full bg-rose-100 items-center justify-center ml-2"
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Add products */}
            <Text className="text-sm text-slate-500 mb-3">
              Tap products to add to order
            </Text>
            {productsData?.products.length === 0 ? (
              <View className="items-center py-8">
                <Package size={48} color="#94A3B8" />
                <Text className="text-slate-700 font-semibold mt-4">No Products</Text>
                <Text className="text-slate-500 text-center mt-2">
                  Add products first before creating orders.
                </Text>
                <Pressable
                  onPress={() => router.push("/add-product")}
                  className="bg-teal-600 rounded-xl px-6 py-3 mt-4"
                >
                  <Text className="text-white font-semibold">Add Product</Text>
                </Pressable>
              </View>
            ) : (
              productsData?.products
                .filter((p) => p.isActive)
                .map((product) => {
                  const inOrder = items.find((i) => i.productId === product.id);
                  return (
                    <Pressable
                      key={product.id}
                      onPress={() => addItem(product)}
                      className={`flex-row items-center p-4 rounded-xl mb-2 border ${
                        inOrder
                          ? "bg-teal-50 border-teal-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Package
                        size={20}
                        color={inOrder ? "#0D9488" : "#64748B"}
                      />
                      <View className="ml-3 flex-1">
                        <Text className="font-medium text-slate-900">
                          {product.name}
                        </Text>
                        <Text className="text-sm text-slate-500">
                          {product.category ?? "No category"} · {product.unit}
                        </Text>
                      </View>
                      {inOrder && (
                        <View className="bg-teal-600 rounded-full px-2 py-1">
                          <Text className="text-white text-xs font-bold">
                            {inOrder.quantity}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })
            )}

            <Pressable
              onPress={() => canProceedToReview && setStep("review")}
              disabled={!canProceedToReview}
              className={`rounded-xl py-4 items-center mt-4 mb-8 ${
                canProceedToReview
                  ? "bg-teal-600 active:bg-teal-700"
                  : "bg-slate-300"
              }`}
            >
              <Text className="text-white font-semibold">Review Order</Text>
            </Pressable>
          </View>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <View className="px-4 pt-4">
            {/* Summary */}
            <View className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <Text className="font-bold text-slate-900 text-lg mb-4">
                Order Summary
              </Text>

              <View className="flex-row items-center mb-3 pb-3 border-b border-slate-100">
                <MapPin size={18} color="#64748B" />
                <View className="ml-3">
                  <Text className="text-xs text-slate-500">Location</Text>
                  <Text className="font-medium text-slate-900">
                    {selectedLocation?.name}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mb-4 pb-3 border-b border-slate-100">
                <Truck size={18} color="#64748B" />
                <View className="ml-3">
                  <Text className="text-xs text-slate-500">Supplier</Text>
                  <Text className="font-medium text-slate-900">
                    {selectedSupplier?.name}
                  </Text>
                </View>
              </View>

              <Text className="font-semibold text-slate-700 mb-2">
                Items ({items.length})
              </Text>
              {items.map((item) => (
                <View
                  key={item.productId}
                  className="flex-row justify-between py-2"
                >
                  <Text className="text-slate-700">{item.productName}</Text>
                  <Text className="font-medium text-slate-900">
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              ))}
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any special instructions..."
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Actions */}
            <Pressable
              onPress={() => createMutation.mutate(false)}
              disabled={!canSubmit || createMutation.isPending}
              className={`rounded-xl py-4 items-center mb-3 border-2 border-teal-600 ${
                createMutation.isPending ? "opacity-50" : "active:bg-teal-50"
              }`}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#0D9488" />
              ) : (
                <Text className="text-teal-600 font-semibold">Save as Draft</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => createMutation.mutate(true)}
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
                <Text className="text-white font-semibold">Send to Supplier</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
