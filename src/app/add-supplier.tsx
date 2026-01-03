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
import { X, Building, User, Phone, Mail, MapPin } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import type { Supplier } from "@/shared/contracts";

export default function AddSupplierScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Supplier>("/api/suppliers", {
        name,
        contactName: contactName || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      router.back();
    },
    onError: () => {
      setError("Failed to create supplier. Please try again.");
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
        <Text className="text-lg font-bold text-slate-900">Add Supplier</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* Error Message */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <Text className="text-rose-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Supplier Name */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Building size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Supplier Name *
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="e.g., Fresh Produce Co."
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            autoCapitalize="words"
          />
        </View>

        {/* Contact Name */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <User size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Contact Person (Optional)
            </Text>
          </View>
          <TextInput
            value={contactName}
            onChangeText={setContactName}
            placeholder="e.g., Juan Rodriguez"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            autoCapitalize="words"
          />
        </View>

        {/* Phone */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Phone size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Phone (Optional)
            </Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g., +1 809 555 1234"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Mail size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Email (Optional)
            </Text>
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="e.g., orders@supplier.com"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Address */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <MapPin size={18} color="#64748B" />
            <Text className="text-sm font-medium text-slate-700 ml-2">
              Address (Optional)
            </Text>
          </View>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="e.g., 123 Market St, Santo Domingo"
            placeholderTextColor="#94A3B8"
            className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
            autoCapitalize="words"
            multiline
          />
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
              Add Supplier
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
