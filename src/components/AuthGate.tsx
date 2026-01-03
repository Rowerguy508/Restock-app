import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";

import { useSession } from "@/lib/useSession";
import { api } from "@/lib/api";
import type { GetMeResponse } from "@/shared/contracts";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const segments = useSegments();
  const { data: session, isPending: sessionLoading } = useSession();
  const [isReady, setIsReady] = useState(false);

  // Fetch user membership data only if logged in
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
  });

  const isLoggedIn = !!session?.user;
  const hasOrganization = !!meData?.membership;
  const isLoading = sessionLoading || (isLoggedIn && meLoading);

  // Current route info
  const inAuthGroup = segments[0] === "login";
  const inOnboarding = segments[0] === "onboarding";
  const inTabs = segments[0] === "(tabs)";

  useEffect(() => {
    if (isLoading) return;

    // Hide splash screen once we know auth state
    SplashScreen.hideAsync();
    setIsReady(true);

    // Route based on auth state
    if (!isLoggedIn) {
      // Not logged in - go to login (unless already there)
      if (!inAuthGroup) {
        router.replace("/login");
      }
    } else if (!hasOrganization) {
      // Logged in but no org - go to onboarding (unless already there)
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
    } else {
      // Fully authenticated with org - go to tabs (if still on auth/onboarding)
      if (inAuthGroup || inOnboarding) {
        router.replace("/");
      }
    }
  }, [isLoggedIn, hasOrganization, isLoading, inAuthGroup, inOnboarding, inTabs]);

  // Show loading while determining auth state
  if (!isReady || isLoading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return <>{children}</>;
}
