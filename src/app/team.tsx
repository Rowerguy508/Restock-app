import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  Users,
  Plus,
  Trash2,
  MapPin,
  Crown,
  User,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { api } from "@/lib/api";
import type {
  GetTeamResponse,
  GetLocationsResponse,
  TeamMember,
} from "@/shared/contracts";

type InviteRole = "OWNER" | "MANAGER";

function MemberCard({
  member,
  isCurrentUser,
  onRemove,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
  onRemove: () => void;
}) {
  const isOwner = member.role === "OWNER";

  return (
    <View className="bg-white rounded-xl border border-slate-100 p-4 mb-3">
      <View className="flex-row items-start">
        {/* Avatar */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: isOwner ? "#D1FAE5" : "#DBEAFE" }}
        >
          {isOwner ? (
            <Crown size={20} color="#059669" />
          ) : (
            <User size={20} color="#2563EB" />
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-slate-900">
              {member.name ?? member.email.split("@")[0]}
            </Text>
            {isCurrentUser && (
              <View className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full">
                <Text className="text-xs text-slate-500">You</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-slate-500 mt-0.5">{member.email}</Text>

          <View className="flex-row items-center mt-2">
            <View
              className="px-2 py-1 rounded-lg mr-2"
              style={{ backgroundColor: isOwner ? "#D1FAE5" : "#DBEAFE" }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: isOwner ? "#059669" : "#2563EB" }}
              >
                {member.role}
              </Text>
            </View>
            {member.locationName && (
              <View className="flex-row items-center px-2 py-1 bg-slate-100 rounded-lg">
                <MapPin size={12} color="#64748B" />
                <Text className="text-xs text-slate-600 ml-1">
                  {member.locationName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Remove button (not for self) */}
        {!isCurrentUser && (
          <Pressable
            onPress={onRemove}
            className="p-2 rounded-lg bg-rose-50 active:bg-rose-100"
          >
            <Trash2 size={18} color="#DC2626" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("MANAGER");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => api.get<GetTeamResponse>("/api/team"),
  });

  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<GetLocationsResponse>("/api/locations"),
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: InviteRole; locationId?: string }) => {
      const response = await api.post<{ success?: boolean; error?: string; message?: string; member?: TeamMember }>("/api/team/invite", data);
      return response;
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["team"] });
        setShowInvite(false);
        setEmail("");
        setRole("MANAGER");
        setSelectedLocationId(null);
        Alert.alert("Success", response.message ?? "Team member added");
      } else {
        Alert.alert("Error", response.message ?? response.error ?? "Failed to invite");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/api/team/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleInvite = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }
    if (role === "MANAGER" && !selectedLocationId) {
      Alert.alert("Error", "Please select a location for the manager");
      return;
    }
    inviteMutation.mutate({
      email: email.toLowerCase().trim(),
      role,
      locationId: role === "MANAGER" ? selectedLocationId ?? undefined : undefined,
    });
  };

  const handleRemove = (member: TeamMember) => {
    Alert.alert(
      "Remove Team Member",
      `Are you sure you want to remove ${member.name ?? member.email} from the team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMutation.mutate(member.id),
        },
      ]
    );
  };

  const currentUserId = teamData?.members.find((m) => m.role === "OWNER")?.userId;
  const selectedLocation = locationsData?.locations.find(
    (l) => l.id === selectedLocationId
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
        >
          <X size={22} color="#1E293B" />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900">Team Members</Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Add Member Button */}
          <Pressable
            onPress={() => setShowInvite(!showInvite)}
            className="bg-teal-600 rounded-xl px-4 py-3.5 flex-row items-center justify-center mb-6 active:bg-teal-700"
          >
            <Plus size={20} color="white" />
            <Text className="text-white font-semibold text-base ml-2">
              Add Team Member
            </Text>
          </Pressable>

          {/* Invite Form */}
          {showInvite && (
            <View className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-50 rounded-lg px-4 py-3 text-base text-slate-900 mb-4"
                placeholderTextColor="#94A3B8"
              />

              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Role
              </Text>
              <Pressable
                onPress={() => setShowRolePicker(!showRolePicker)}
                className="bg-slate-50 rounded-lg px-4 py-3 flex-row items-center justify-between mb-2"
              >
                <Text className="text-base text-slate-900">{role}</Text>
                <ChevronDown size={18} color="#64748B" />
              </Pressable>
              {showRolePicker && (
                <View className="bg-slate-100 rounded-lg overflow-hidden mb-4">
                  <Pressable
                    onPress={() => {
                      setRole("OWNER");
                      setShowRolePicker(false);
                      setSelectedLocationId(null);
                    }}
                    className="px-4 py-3 flex-row items-center justify-between border-b border-slate-200"
                  >
                    <View className="flex-row items-center">
                      <Crown size={16} color="#059669" />
                      <Text className="ml-2 text-slate-900">OWNER</Text>
                    </View>
                    {role === "OWNER" && <Check size={18} color="#0D9488" />}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setRole("MANAGER");
                      setShowRolePicker(false);
                    }}
                    className="px-4 py-3 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center">
                      <User size={16} color="#2563EB" />
                      <Text className="ml-2 text-slate-900">MANAGER</Text>
                    </View>
                    {role === "MANAGER" && <Check size={18} color="#0D9488" />}
                  </Pressable>
                </View>
              )}

              {role === "MANAGER" && (
                <>
                  <Text className="text-sm font-semibold text-slate-700 mb-2 mt-2">
                    Assigned Location
                  </Text>
                  <Pressable
                    onPress={() => setShowLocationPicker(!showLocationPicker)}
                    className="bg-slate-50 rounded-lg px-4 py-3 flex-row items-center justify-between mb-2"
                  >
                    <Text
                      className={`text-base ${selectedLocation ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {selectedLocation?.name ?? "Select location"}
                    </Text>
                    <ChevronDown size={18} color="#64748B" />
                  </Pressable>
                  {showLocationPicker && (
                    <View className="bg-slate-100 rounded-lg overflow-hidden mb-4">
                      {locationsData?.locations.map((location) => (
                        <Pressable
                          key={location.id}
                          onPress={() => {
                            setSelectedLocationId(location.id);
                            setShowLocationPicker(false);
                          }}
                          className="px-4 py-3 flex-row items-center justify-between border-b border-slate-200"
                        >
                          <View className="flex-row items-center">
                            <MapPin size={16} color="#64748B" />
                            <Text className="ml-2 text-slate-900">
                              {location.name}
                            </Text>
                          </View>
                          {selectedLocationId === location.id && (
                            <Check size={18} color="#0D9488" />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View className="flex-row gap-3 mt-4">
                <Pressable
                  onPress={() => {
                    setShowInvite(false);
                    setEmail("");
                    setRole("MANAGER");
                    setSelectedLocationId(null);
                  }}
                  className="flex-1 bg-slate-100 rounded-lg py-3 items-center active:bg-slate-200"
                >
                  <Text className="text-slate-700 font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleInvite}
                  disabled={inviteMutation.isPending}
                  className="flex-1 bg-teal-600 rounded-lg py-3 items-center active:bg-teal-700"
                >
                  {inviteMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Add Member</Text>
                  )}
                </Pressable>
              </View>

              <Text className="text-xs text-slate-500 mt-3 text-center">
                Note: The user must have an existing account. Ask them to sign up
                first, then add them here.
              </Text>
            </View>
          )}

          {/* Team List */}
          <View className="flex-row items-center mb-4">
            <Users size={18} color="#64748B" />
            <Text className="text-sm font-semibold text-slate-500 ml-2 uppercase tracking-wide">
              Team ({teamData?.members.length ?? 0})
            </Text>
          </View>

          {teamData?.members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.userId === currentUserId}
              onRemove={() => handleRemove(member)}
            />
          ))}

          {(!teamData?.members || teamData.members.length === 0) && (
            <View className="items-center py-12">
              <Users size={48} color="#CBD5E1" />
              <Text className="text-slate-400 mt-4">No team members yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
