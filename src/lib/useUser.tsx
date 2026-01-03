import React, { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useSession } from "./useSession";
import type { GetMeResponse } from "@/shared/contracts";

type UserContextType = {
  user: GetMeResponse["user"] | null;
  membership: GetMeResponse["membership"] | null;
  organization: GetMeResponse["organization"] | null;
  location: GetMeResponse["location"] | null;
  isOwner: boolean;
  isManager: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionLoading } = useSession();

  const {
    data: meData,
    isLoading: meLoading,
    refetch,
  } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<GetMeResponse>("/api/me"),
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isLoading = sessionLoading || meLoading;
  const isAuthenticated = !!session?.user;

  const value: UserContextType = {
    user: meData?.user ?? null,
    membership: meData?.membership ?? null,
    organization: meData?.organization ?? null,
    location: meData?.location ?? null,
    isOwner: meData?.membership?.role === "OWNER",
    isManager: meData?.membership?.role === "MANAGER",
    isLoading,
    isAuthenticated,
    refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
