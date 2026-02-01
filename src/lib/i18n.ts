// ============================================
// ReStocka Internationalization (i18n)
// ============================================
// Detects device language and provides translations
// ============================================

import * as Localization from "expo-localization";
import { I18n } from "i18n-js";

// ============================================
// TRANSLATIONS
// ============================================

const en = {
  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.retry": "Retry",
  "common.close": "Close",
  "common.back": "Back",
  "common.next": "Next",
  "common.done": "Done",
  "common.yes": "Yes",
  "common.no": "No",
  "common.ok": "OK",
  "common.upgrade": "Upgrade",
  "common.learnMore": "Learn More",

  // Subscription
  "subscription.title": "Subscription",
  "subscription.currentPlan": "Current Plan",
  "subscription.trial": "Trial",
  "subscription.trial.daysRemaining": "{days} days remaining",
  "subscription.trial.expired": "Trial Expired",
  "subscription.trial.upgradePrompt": "Upgrade now to continue with all features.",
  
  "subscription.plan.free": "Free",
  "subscription.plan.free.description": "For restaurants just starting out",
  
  "subscription.plan.pro": "Pro",
  "subscription.plan.pro.description": "For growing restaurants",
  "subscription.plan.pro.mostPopular": "Most Popular",
  
  "subscription.plan.business": "Business",
  "subscription.plan.business.description": "For chains and large operations",
  
  "subscription.pricing.perMonth": "/month",
  "subscription.pricing.perForever": "/forever",
  
  "subscription.features.locations": "Locations",
  "subscription.features.products": "Products",
  "subscription.features.ordersPerMonth": "Orders/month",
  "subscription.features.users": "Team Members",
  "subscription.features.unlimited": "Unlimited",
  
  "subscription.features.autoReorder": "Auto-reorder",
  "subscription.features.analytics": "Analytics",
  "subscription.features.mobileApp": "Mobile App",
  "subscription.features.prioritySupport": "Priority Support",
  "subscription.features.apiAccess": "API Access",
  "subscription.features.support24_7": "24/7 Support",
  
  "subscription.cta.trial": "Start Free Trial",
  "subscription.cta.currentPlan": "Current Plan",
  "subscription.cta.upgrade": "Upgrade Now",
  
  "subscription.limit.reached": "Limit Reached",
  "subscription.limit.locations": "You've reached the limit of {limit} locations.",
  "subscription.limit.products": "You've reached the limit of {limit} products.",
  "subscription.limit.orders": "You've reached the limit of {limit} orders this month.",
  "subscription.limit.upgrade": "Upgrade your plan for more.",
  
  "subscription.usage.title": "Usage",
  "subscription.usage.of": "{current} of {limit}",
  "subscription.usage.locations": "Locations used",
  "subscription.usage.products": "Products tracked",
  "subscription.usage.orders": "Orders this month",
  
  "subscription.cancel.title": "Cancel Subscription",
  "subscription.cancel.confirm": "Are you sure you want to cancel? You'll lose access to premium features.",
  "subscription.cancel.keepAccess": "Keep Access",
  "subscription.cancel.confirmCancel": "Cancel Subscription",
  
  "subscription.success.upgraded": "Successfully upgraded to {plan}!",
  "subscription.success.cancelled": "Subscription cancelled",
  "subscription.error.upgradeFailed": "Failed to upgrade. Please try again.",
  
  // Usage
  "usage.locations": "1 location | {count} locations",
  "usage.products": "1 product | {count} products",
  "usage.orders": "1 order | {count} orders",
};

const es = {
  // Common
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.loading": "Cargando...",
  "common.error": "Error",
  "common.retry": "Reintentar",
  "common.close": "Cerrar",
  "common.back": "Atrás",
  "common.next": "Siguiente",
  "common.done": "Listo",
  "common.yes": "Sí",
  "common.no": "No",
  "common.ok": "OK",
  "common.upgrade": "Mejorar",
  "common.learnMore": "Más Info",

  // Subscription
  "subscription.title": "Suscripción",
  "subscription.currentPlan": "Plan Actual",
  "subscription.trial": "Prueba",
  "subscription.trial.daysRemaining": "{days} días restantes",
  "subscription.trial.expired": "Prueba Finalizada",
  "subscription.trial.upgradePrompt": "Mejora ahora para continuar con todas las funciones.",
  
  "subscription.plan.free": "Gratis",
  "subscription.plan.free.description": "Para restaurantes que están comenzando",
  
  "subscription.plan.pro": "Pro",
  "subscription.plan.pro.description": "Para restaurantes en crecimiento",
  "subscription.plan.pro.mostPopular": "Más Popular",
  
  "subscription.plan.business": "Negocio",
  "subscription.plan.business.description": "Para cadenas y operaciones grandes",
  
  "subscription.pricing.perMonth": "/mes",
  "subscription.pricing.perForever": "/para siempre",
  
  "subscription.features.locations": "Ubicaciones",
  "subscription.features.products": "Productos",
  "subscription.features.ordersPerMonth": "Pedidos/mes",
  "subscription.features.users": "Miembros del equipo",
  "subscription.features.unlimited": "Ilimitado",
  
  "subscription.features.autoReorder": "Auto-reorden",
  "subscription.features.analytics": "Análisis",
  "subscription.features.mobileApp": "App móvil",
  "subscription.features.prioritySupport": "Soporte prioritario",
  "subscription.features.apiAccess": "Acceso API",
  "subscription.features.support24_7": "Soporte 24/7",
  
  "subscription.cta.trial": "Empezar Prueba Gratis",
  "subscription.cta.currentPlan": "Plan Actual",
  "subscription.cta.upgrade": "Mejorar Ahora",
  
  "subscription.limit.reached": "Límite Alcanzado",
  "subscription.limit.locations": "Has alcanzado el límite de {limit} ubicaciones.",
  "subscription.limit.products": "Has alcanzado el límite de {limit} productos.",
  "subscription.limit.orders": "Has alcanzado el límite de {limit} pedidos este mes.",
  "subscription.limit.upgrade": "Mejora tu plan para más.",
  
  "subscription.usage.title": "Uso",
  "subscription.usage.of": "{current} de {limit}",
  "subscription.usage.locations": "Ubicaciones usadas",
  "subscription.usage.products": "Productos rastreados",
  "subscription.usage.orders": "Pedidos este mes",
  
  "subscription.cancel.title": "Cancelar Suscripción",
  "subscription.cancel.confirm": "¿Estás seguro de que quieres cancelar? Perderás acceso a las funciones premium.",
  "subscription.cancel.keepAccess": "Mantener Acceso",
  "subscription.cancel.confirmCancel": "Cancelar Suscripción",
  
  "subscription.success.upgraded": "¡Mejorado exitosamente a {plan}!",
  "subscription.success.cancelled": "Suscripción cancelada",
  "subscription.error.upgradeFailed": "Error al mejorar. Por favor intenta de nuevo.",
  
  // Usage
  "usage.locations": "1 ubicación | {count} ubicaciones",
  "usage.products": "1 producto | {count} productos",
  "usage.orders": "1 pedido | {count} pedidos",
};

const pt = {
  // Common
  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.loading": "Carregando...",
  "common.error": "Erro",
  "common.retry": "Tentar novamente",
  "common.close": "Fechar",
  "common.back": "Voltar",
  "common.next": "Próximo",
  "common.done": "Concluído",
  "common.yes": "Sim",
  "common.no": "Não",
  "common.ok": "OK",
  "common.upgrade": "Atualizar",
  "common.learnMore": "Saiba mais",

  // Subscription
  "subscription.title": "Assinatura",
  "subscription.currentPlan": "Plano Atual",
  "subscription.trial": "Teste",
  "subscription.trial.daysRemaining": "{days} dias restantes",
  "subscription.trial.expired": "Teste Expirado",
  "subscription.trial.upgradePrompt": "Atualize agora para continuar com todos os recursos.",
  
  "subscription.plan.free": "Gratuito",
  "subscription.plan.free.description": "Para restaurantes que estão começando",
  
  "subscription.plan.pro": "Pro",
  "subscription.plan.pro.description": "Para restaurantes em crescimento",
  "subscription.plan.pro.mostPopular": "Mais Popular",
  
  "subscription.plan.business": "Negócio",
  "subscription.plan.business.description": "Para cadeias e operações grandes",
  
  "subscription.pricing.perMonth": "/mês",
  "subscription.pricing.perForever": "/para sempre",
  
  "subscription.features.locations": "Locais",
  "subscription.features.products": "Produtos",
  "subscription.features.ordersPerMonth": "Pedidos/mês",
  "subscription.features.users": "Membros da equipe",
  "subscription.features.unlimited": "Ilimitado",
  
  "subscription.features.autoReorder": "Pedido automático",
  "subscription.features.analytics": "Análises",
  "subscription.features.mobileApp": "Aplicativo móvel",
  "subscription.features.prioritySupport": "Suporte prioritário",
  "subscription.features.apiAccess": "Acesso API",
  "subscription.features.support24_7": "Suporte 24/7",
  
  "subscription.cta.trial": "Começar teste grátis",
  "subscription.cta.currentPlan": "Plano Atual",
  "subscription.cta.upgrade": "Atualizar agora",
  
  "subscription.limit.reached": "Limite Atingido",
  "subscription.limit.locations": "Você atingiu o limite de {limit} locais.",
  "subscription.limit.products": "Você atingiu o limite de {limit} produtos.",
  "subscription.limit.orders": "Você atingiu o limite de {limit} pedidos este mês.",
  "subscription.limit.upgrade": "Atualize seu plano para mais.",
  
  "subscription.usage.title": "Uso",
  "subscription.usage.of": "{current} de {limit}",
  "subscription.usage.locations": "Locais usados",
  "subscription.usage.products": "Produtos rastreados",
  "subscription.usage.orders": "Pedidos este mês",
  
  "subscription.cancel.title": "Cancelar Assinatura",
  "subscription.cancel.confirm": "Tem certeza de que deseja cancelar? Você perderá acesso aos recursos premium.",
  "subscription.cancel.keepAccess": "Manter Acesso",
  "subscription.cancel.confirmCancel": "Cancelar Assinatura",
  
  "subscription.success.upgraded": "Atualizado com sucesso para {plan}!",
  "subscription.success.cancelled": "Assinatura cancelada",
  "subscription.error.upgradeFailed": "Falha ao atualizar. Por favor, tente novamente.",
  
  // Usage
  "usage.locations": "1 local | {count} locais",
  "usage.products": "1 produto | {count} produtos",
  "usage.orders": "1 pedido | {count} pedidos",
};

// ============================================
// SUPPORTED LANGUAGES
// ============================================

export const SUPPORTED_LOCALES = {
  en: "English",
  es: "Español",
  pt: "Português (Brasil)",
};

export type Locale = keyof typeof SUPPORTED_LOCALES;

// ============================================
// I18N INSTANCE
// ============================================

// Default to device locale, fallback to English
const getDeviceLocale = (): Locale => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
  
  // Map common locales to supported languages
  const localeMap: Record<string, Locale> = {
    en: "en",
    "en-US": "en",
    "en-GB": "en",
    es: "es",
    "es-ES": "es",
    "es-MX": "es",
    "es-419": "es",
    pt: "pt",
    "pt-BR": "pt",
    "pt-PT": "pt",
  };
  
  return localeMap[deviceLocale] ?? "en";
};

export const i18n = new I18n({
  en,
  es,
  pt,
});

// Initialize with device locale
i18n.locale = getDeviceLocale();

// Enable fallback
i18n.fallbacks = true;

// Helper to get translation with optional interpolation
export const t = (key: keyof typeof en, params?: Record<string, string | number>): string => {
  if (params) {
    let text = i18n.t(key);
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(`{${key}}`, String(value));
    });
    return text;
  }
  return i18n.t(key);
};

// Helper to format numbers with locale
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat(i18n.locale).format(num);
};

// Helper to check if locale is right-to-left (for future RTL support)
export const isRTL = (): boolean => {
  const locale = i18n.locale;
  return ["ar", "he", "fa", "ur"].includes(locale);
};
