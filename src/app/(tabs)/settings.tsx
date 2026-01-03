import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Building2,
  MapPin,
  Package,
  Truck,
  LogOut,
  ChevronRight,
  Plus,
  ShoppingCart,
  Settings2,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { authClient } from "@/lib/authClient";
import type {
  GetMeResponse,
  GetProductsResponse,
  GetSuppliersResponse,
  GetLocationsResponse,
} from "@/shared/contracts";

function SettingsSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </Text>
        {action}
      </View>
      <View className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onPress,
  showArrow = true,
  danger = false,
}: {
  icon: typeof Package;
  label: string;
  value?: string | number;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center px-4 py-3.5 border-b border-slate-100 active:bg-slate-50"
    >
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: danger ? "#FEE2E2" : "#F1F5F9" }}
      >
        <Icon size={18} color={danger ? "#DC2626" : "#64748B"} />
      </View>
      <Text
        className={`flex-1 text-base ${danger ? "text-rose-600" : "text-slate-900"}`}
      >
        {label}
      </Text>
      {value !== undefined && (
        <Text className="text-slate-500 mr-2">{value}</Text>
      )}
      {showArrow && onPress && <ChevronRight size={18} color="#94A3B8" />}
    </Pressable>
  );
}

function AddButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-2 py-1 rounded-lg bg-teal-50 active:bg-teal-100"
    >
      <Plus size={14} color="#0D9488" />
      <Text className="text-teal-600 text-xs font-semibold ml-1">{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionLoading } = useSession();

  const { data: meData, isLoading: meLoading } = useQuery({
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

  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<GetLocationsResponse>("/api/locations"),
    enabled: !!meData?.membership,
  });

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
      // AuthGate will handle navigation
    },
  });

  if (sessionLoading || meLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!session?.user || !meData?.membership) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const isOwner = meData.membership.role === "OWNER";

  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* User Info Header */}
      <View className="bg-white px-4 py-5 border-b border-slate-100">
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-teal-100 items-center justify-center mr-4">
            <Text className="text-teal-700 text-xl font-bold">
              {session.user.name?.charAt(0).toUpperCase() ??
                session.user.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              {session.user.name ?? "User"}
            </Text>
            <Text className="text-slate-500">{session.user.email}</Text>
            <View className="flex-row items-center mt-1">
              <View
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isOwner ? "#D1FAE5" : "#DBEAFE",
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isOwner ? "#059669" : "#2563EB" }}
                >
                  {isOwner ? "Owner" : "Manager"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="px-4 pt-6">
        {/* Organization Section */}
        {meData.organization && (
          <SettingsSection title="Organization">
            <SettingsRow
              icon={Building2}
              label={meData.organization.name}
              showArrow={false}
            />
            <SettingsRow
              icon={MapPin}
              label="Locations"
              value={locationsData?.locations.length ?? 0}
              showArrow={false}
            />
          </SettingsSection>
        )}

        {/* Quick Actions (Owner Only) */}
        {isOwner && (
          <SettingsSection title="Quick Actions">
            <Pressable
              onPress={() => router.push("/create-order")}
              className="flex-row items-center px-4 py-3.5 border-b border-slate-100 active:bg-slate-50"
            >
              <View className="w-8 h-8 rounded-lg items-center justify-center mr-3 bg-teal-100">
                <ShoppingCart size={18} color="#0D9488" />
              </View>
              <Text className="flex-1 text-base text-slate-900">
                Create Purchase Order
              </Text>
              <ChevronRight size={18} color="#94A3B8" />
            </Pressable>
          </SettingsSection>
        )}

        {/* Inventory Management (Owner Only) */}
        {isOwner && (
          <SettingsSection
            title="Inventory Management"
            action={
              <View className="flex-row gap-2">
                <AddButton
                  onPress={() => router.push("/add-product")}
                  label="Product"
                />
                <AddButton
                  onPress={() => router.push("/add-supplier")}
                  label="Supplier"
                />
              </View>
            }
          >
            <SettingsRow
              icon={Package}
              label="Products"
              value={productsData?.products.length ?? 0}
              onPress={() => router.push("/add-product")}
            />
            <SettingsRow
              icon={Truck}
              label="Suppliers"
              value={suppliersData?.suppliers.length ?? 0}
              onPress={() => router.push("/add-supplier")}
            />
            <SettingsRow
              icon={Settings2}
              label="Reorder Rules"
              onPress={() => router.push("/reorder-rules")}
            />
          </SettingsSection>
        )}

        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsRow
            icon={LogOut}
            label="Sign Out"
            onPress={() => signOutMutation.mutate()}
            showArrow={false}
            danger
          />
        </SettingsSection>

        {/* App Info */}
        <View className="items-center py-8">
          <Text className="text-slate-400 text-sm">ReStocka v1.0.0</Text>
          <Text className="text-slate-400 text-xs mt-1">
            Auto-replenishment for restaurants
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
