import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, ArrowRight, LogOut } from "lucide-react-native";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { LinearGradient } from "expo-linear-gradient";
import type { CreateOrganizationResponse } from "@/shared/contracts";

export default function OnboardingScreen() {
  const queryClient = useQueryClient();

  const [organizationName, setOrganizationName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const createOrgMutation = useMutation({
    mutationFn: () =>
      api.post<CreateOrganizationResponse>("/api/onboarding", {
        organizationName,
        locationName,
        locationAddress: locationAddress || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // AuthGate will handle navigation
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
      // AuthGate will handle navigation back to login
    },
  });

  const canSubmit =
    organizationName.trim().length > 0 && locationName.trim().length > 0;

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={["#0F172A", "#1E3A5F"]}
        style={{
          paddingTop: 60,
          paddingBottom: 32,
          paddingHorizontal: 24,
        }}
      >
        {/* Sign Out Button - lets users switch accounts */}
        <Pressable
          onPress={() => signOutMutation.mutate()}
          disabled={signOutMutation.isPending}
          className="absolute top-14 right-4 flex-row items-center px-3 py-2 rounded-full bg-white/20 active:bg-white/30"
          style={{ zIndex: 10 }}
        >
          <LogOut size={16} color="white" />
          <Text className="text-white text-sm ml-1.5">Sign Out</Text>
        </Pressable>

        <Text className="text-white text-2xl font-bold mb-2">
          Set Up Your Business
        </Text>
        <Text className="text-slate-300 text-base">
          Create your restaurant organization to get started with ReStocka.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6">
          {/* Organization Name */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Building2 size={18} color="#64748B" />
              <Text className="text-sm font-medium text-slate-700 ml-2">
                Business Name
              </Text>
            </View>
            <TextInput
              value={organizationName}
              onChangeText={setOrganizationName}
              placeholder="e.g., La Cocina Restaurant"
              placeholderTextColor="#94A3B8"
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              autoCapitalize="words"
            />
            <Text className="text-xs text-slate-500 mt-2">
              This is your restaurant business name.
            </Text>
          </View>

          {/* Location Name */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <MapPin size={18} color="#64748B" />
              <Text className="text-sm font-medium text-slate-700 ml-2">
                First Location Name
              </Text>
            </View>
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g., Main Branch"
              placeholderTextColor="#94A3B8"
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              autoCapitalize="words"
            />
            <Text className="text-xs text-slate-500 mt-2">
              You can add more locations later.
            </Text>
          </View>

          {/* Location Address (Optional) */}
          <View className="mb-8">
            <View className="flex-row items-center mb-2">
              <Text className="text-sm font-medium text-slate-700">
                Address (Optional)
              </Text>
            </View>
            <TextInput
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="e.g., 123 Main St, Santo Domingo"
              placeholderTextColor="#94A3B8"
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              autoCapitalize="words"
            />
          </View>

          {/* Error Message */}
          {createOrgMutation.isError && (
            <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
              <Text className="text-rose-700 text-sm">
                Failed to create organization. Please try again.
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            onPress={() => createOrgMutation.mutate()}
            disabled={!canSubmit || createOrgMutation.isPending}
            className={`rounded-xl py-4 flex-row items-center justify-center ${
              canSubmit && !createOrgMutation.isPending
                ? "bg-teal-600 active:bg-teal-700"
                : "bg-slate-300"
            }`}
          >
            {createOrgMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text className="text-white font-semibold text-base mr-2">
                  Get Started
                </Text>
                <ArrowRight size={18} color="white" />
              </>
            )}
          </Pressable>

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
