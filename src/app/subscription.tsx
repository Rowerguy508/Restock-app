// ============================================
// ReStocka Subscription Screen
// ============================================
// Pricing and upgrade screen with device language support
// ============================================

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, X, Crown, Zap, Building2 } from "lucide-react-native";
import { api } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { t, i18n } from "@/lib/i18n";

// ============================================
// TYPES
// ============================================

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  limits: {
    locations: number;
    products: number;
    ordersPerMonth: number;
    users: number;
    locationsText: string;
    productsText: string;
    ordersText: string;
  };
}

interface SubscriptionStatus {
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  tier: "FREE" | "PRO" | "BUSINESS";
  tierName: string;
  daysRemaining: number;
  isActive: boolean;
}

interface UsageStats {
  locations: number;
  products: number;
  ordersThisMonth: number;
}

// ============================================
// CONSTANTS
// ============================================

const PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: "FREE",
    name: i18n.t("subscription.plan.free"),
    price: 0,
    interval: "forever",
    features: [
      "subscription.features.locations",
      "subscription.features.products",
      "subscription.features.ordersPerMonth",
    ],
    limits: {
      locations: 1,
      products: 5,
      ordersPerMonth: 10,
      users: 1,
      locationsText: "1",
      productsText: "5",
      ordersText: "10",
    },
  },
  PRO: {
    id: "PRO",
    name: i18n.t("subscription.plan.pro"),
    price: 29,
    interval: "month",
    features: [
      "subscription.features.locations",
      "subscription.features.products",
      "subscription.features.ordersPerMonth",
      "subscription.features.autoReorder",
      "subscription.features.analytics",
      "subscription.features.mobileApp",
      "subscription.features.prioritySupport",
    ],
    limits: {
      locations: 3,
      products: 50,
      ordersPerMonth: 100,
      users: 3,
      locationsText: "3",
      productsText: "50",
      ordersText: "100",
    },
  },
  BUSINESS: {
    id: "BUSINESS",
    name: i18n.t("subscription.plan.business"),
    price: 79,
    interval: "month",
    features: [
      "subscription.features.locations",
      "subscription.features.products",
      "subscription.features.ordersPerMonth",
      "subscription.features.autoReorder",
      "subscription.features.analytics",
      "subscription.features.apiAccess",
      "subscription.features.support24_7",
    ],
    limits: {
      locations: -1,
      products: -1,
      ordersPerMonth: -1,
      users: -1,
      locationsText: i18n.t("subscription.features.unlimited"),
      productsText: i18n.t("subscription.features.unlimited"),
      ordersText: i18n.t("subscription.features.unlimited"),
    },
  },
};

// ============================================
// COMPONENTS
// ============================================

function PricingCard({
  plan,
  isCurrentPlan,
  isPopular,
  onSelect,
  disabled,
}: {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const isUnlimited = (val: number) => val === -1;
  const priceLabel = plan.price === 0 
    ? t("subscription.pricing.perForever")
    : t("subscription.pricing.perMonth");

  return (
    <View style={[styles.card, isPopular && styles.cardPopular]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>{t("subscription.plan.pro.mostPopular")}</Text>
        </View>
      )}
      
      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planDescription}>
        {plan.id === "FREE" 
          ? t("subscription.plan.free.description")
          : plan.id === "PRO"
          ? t("subscription.plan.pro.description")
          : t("subscription.plan.business.description")}
      </Text>
      
      <View style={styles.priceContainer}>
        <Text style={styles.price}>
          {plan.price === 0 ? "$0" : `$${plan.price}`}
        </Text>
        <Text style={styles.priceLabel}>{priceLabel}</Text>
      </View>
      
      <View style={styles.featuresContainer}>
        {plan.features.map((featureKey, index) => (
          <View key={index} style={styles.featureRow}>
            <Check size={16} color="#10B981" />
            <Text style={styles.featureText}>
              {featureKey.startsWith("subscription.features.")
                ? t(featureKey)
                : featureKey}
            </Text>
          </View>
        ))}
      </View>
      
      <View style={styles.limitsContainer}>
        <Text style={styles.limitsTitle}>{t("subscription.usage.title")}</Text>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>{t("subscription.features.locations")}:</Text>
          <Text style={styles.limitValue}>
            {isUnlimited(plan.limits.locations) 
              ? t("subscription.features.unlimited") 
              : plan.limits.locationsText}
          </Text>
        </View>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>{t("subscription.features.products")}:</Text>
          <Text style={styles.limitValue}>
            {isUnlimited(plan.limits.products) 
              ? t("subscription.features.unlimited") 
              : plan.limits.productsText}
          </Text>
        </View>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>{t("subscription.features.ordersPerMonth")}:</Text>
          <Text style={styles.limitValue}>
            {isUnlimited(plan.limits.ordersPerMonth) 
              ? t("subscription.features.unlimited") 
              : plan.limits.ordersText}
          </Text>
        </View>
      </View>
      
      <Pressable
        onPress={onSelect}
        disabled={isCurrentPlan || disabled}
        style={[
          styles.button,
          isCurrentPlan && styles.buttonDisabled,
          isPopular && styles.buttonPrimary,
        ]}
      >
        <Text style={[
          styles.buttonText,
          isPopular && styles.buttonTextPrimary,
          isCurrentPlan && styles.buttonTextDisabled,
        ]}>
          {isCurrentPlan 
            ? t("subscription.cta.currentPlan")
            : plan.price === 0 
            ? t("subscription.cta.trial")
            : t("subscription.cta.upgrade")}
        </Text>
      </Pressable>
    </View>
  );
}

function UsageCard({ usage, limits }: { usage: UsageStats; limits: Record<string, number | -1> }) {
  const formatUsage = (current: number, limit: number | -1) => {
    if (limit === -1) return `${current} ∞`;
    return `${current} / ${limit}`;
  };

  return (
    <View style={styles.usageCard}>
      <Text style={styles.usageTitle}>{t("subscription.usage.title")}</Text>
      
      <View style={styles.usageRow}>
        <Building2 size={20} color="#64748B" />
        <Text style={styles.usageLabel}>{t("subscription.features.locations")}</Text>
        <Text style={styles.usageValue}>
          {formatUsage(usage.locations, limits.locations)}
        </Text>
      </View>
      
      <View style={styles.usageRow}>
        <View style={{ width: 20, height: 20 }} />
        <Text style={styles.usageLabel}>{t("subscription.features.products")}</Text>
        <Text style={styles.usageValue}>
          {formatUsage(usage.products, limits.products)}
        </Text>
      </View>
      
      <View style={styles.usageRow}>
        <Zap size={20} color="#64748B" />
        <Text style={styles.usageLabel}>{t("subscription.usage.orders")}</Text>
        <Text style={styles.usageValue}>
          {formatUsage(usage.ordersThisMonth, limits.ordersPerMonth)}
        </Text>
      </View>
    </View>
  );
}

function TrialBanner({ daysRemaining }: { daysRemaining: number }) {
  return (
    <View style={styles.trialBanner}>
      <Crown size={20} color="#F59E0B" />
      <Text style={styles.trialText}>
        {t("subscription.trial.daysRemaining", { days: daysRemaining.toString() })}
      </Text>
      <Text style={styles.trialSubtext}>{t("subscription.trial.upgradePrompt")}</Text>
    </View>
  );
}

function ExpiredBanner() {
  return (
    <View style={[styles.trialBanner, styles.trialExpired]}>
      <X size={20} color="#DC2626" />
      <Text style={styles.trialText}>{t("subscription.trial.expired")}</Text>
      <Text style={styles.trialSubtext}>{t("subscription.trial.upgradePrompt")}</Text>
    </View>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function SubscriptionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch subscription status (with fallback for demo)
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        return await api.get<any>("/api/subscription/status");
      } catch {
        // Fallback for demo when API not available
        return {
          status: "TRIAL",
          tier: "PRO",
          tierName: "Pro",
          daysRemaining: 5,
          isActive: true,
        };
      }
    },
    enabled: !!session?.user,
  });

  // Fetch usage stats (with fallback)
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["subscription-usage"],
    queryFn: async () => {
      try {
        return await api.get<any>("/api/subscription/usage");
      } catch {
        // Fallback for demo
        return {
          usage: { locations: 1, products: 3, ordersThisMonth: 5 },
          limits: { locations: 3, products: 50, ordersPerMonth: 100 },
        };
      }
    },
    enabled: !!session?.user,
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async (tier: string) => {
      return api.post("/api/subscription/upgrade", { tier });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      // Show success message
    },
    onError: () => {
      // Show error
    },
  });

  if (subLoading || usageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  const isCurrentPlan = (planId: string) => {
    if (!subscription) return planId === "PRO";
    const currentTier = subscription.tier;
    if (planId === "FREE" && currentTier === "FREE") return true;
    if (planId === "PRO" && currentTier === "PRO") return true;
    if (planId === "BUSINESS" && currentTier === "BUSINESS") return true;
    return false;
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === "FREE") return; // Can't downgrade to free
    setSelectedPlan(planId);
    upgradeMutation.mutate(planId);
  };

  const showTrialBanner = subscription?.status === "TRIAL" && subscription.daysRemaining > 0;
  const showExpiredBanner = subscription?.status === "EXPIRED" || (subscription?.status === "TRIAL" && subscription.daysRemaining <= 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("subscription.title")}</Text>
        <Text style={styles.subtitle}>
          {t("subscription.currentPlan")}: {subscription?.tierName || "Pro"}
        </Text>
      </View>

      {/* Trial/Expired Banner */}
      {showTrialBanner && <TrialBanner daysRemaining={subscription.daysRemaining} />}
      {showExpiredBanner && <ExpiredBanner />}

      {/* Usage Stats */}
      {usageData && (
        <UsageCard 
          usage={usageData.usage} 
          limits={usageData.limits || PLANS.PRO.limits} 
        />
      )}

      {/* Pricing Cards */}
      <View style={styles.plansContainer}>
        <PricingCard
          plan={PLANS.FREE}
          isCurrentPlan={isCurrentPlan("FREE")}
          onSelect={() => {}}
        />
        <PricingCard
          plan={PLANS.PRO}
          isCurrentPlan={isCurrentPlan("PRO")}
          isPopular={!isCurrentPlan("BUSINESS")}
          onSelect={() => handlePlanSelect("PRO")}
          disabled={upgradeMutation.isPending}
        />
        <PricingCard
          plan={PLANS.BUSINESS}
          isCurrentPlan={isCurrentPlan("BUSINESS")}
          onSelect={() => handlePlanSelect("BUSINESS")}
          disabled={upgradeMutation.isPending}
        />
      </View>

      {/* Loading Indicator */}
      {upgradeMutation.isPending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      )}

      {/* Footer Note */}
      <Text style={styles.footerNote}>
        🔒 {i18n.locale === "es" 
          ? "Pago seguro con Stripe. Cancela cuando quieras."
          : "Secure payment with Stripe. Cancel anytime."}
      </Text>
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  trialExpired: {
    backgroundColor: "#FEE2E2",
  },
  trialText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginLeft: 8,
  },
  trialSubtext: {
    width: "100%",
    fontSize: 14,
    color: "#A16207",
    marginTop: 4,
    marginLeft: 28,
  },
  usageCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  usageLabel: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
    marginLeft: 8,
  },
  usageValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0D9488",
  },
  plansContainer: {
    flexDirection: isTablet ? "row" : "column",
    gap: 16,
    justifyContent: "center",
  },
  card: {
    flex: isTablet ? 1 : undefined,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: isTablet ? 320 : "100%",
  },
  cardPopular: {
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  popularBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#0D9488",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  planName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 20,
  },
  price: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#0D9488",
  },
  priceLabel: {
    fontSize: 16,
    color: "#64748B",
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    marginLeft: 8,
  },
  limitsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  limitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  limitLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  limitValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  button: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#0D9488",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  buttonTextPrimary: {
    color: "white",
  },
  buttonTextDisabled: {
    color: "#64748B",
  },
  loadingOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 24,
  },
});
