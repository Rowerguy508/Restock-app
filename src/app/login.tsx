import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { Package } from "lucide-react-native";

import { authClient } from "@/lib/authClient";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Please check your credentials");
      }
      // AuthGate will handle navigation on success
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Please try again");
      }
      // AuthGate will handle navigation on success
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1">
      {/* Header with branding */}
      <LinearGradient
        colors={["#0F172A", "#1E3A5F"]}
        style={{
          paddingTop: 80,
          paddingBottom: 40,
          paddingHorizontal: 24,
          alignItems: "center",
        }}
      >
        <View className="w-20 h-20 rounded-2xl bg-teal-500/20 items-center justify-center mb-4">
          <Package size={40} color="#14B8A6" />
        </View>
        <Text className="text-white text-3xl font-bold mb-2">ReStocka</Text>
        <Text className="text-slate-400 text-base text-center">
          Auto-replenishment for restaurants
        </Text>
      </LinearGradient>

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-slate-50"
      >
        <View className="flex-1 px-6 pt-8">
          <Text className="text-2xl font-bold text-slate-900 mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text className="text-slate-500 mb-8">
            {isSignUp
              ? "Sign up to start managing your inventory"
              : "Sign in to continue"}
          </Text>

          {/* Error Message */}
          {error && (
            <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
              <Text className="text-rose-700 text-sm">{error}</Text>
            </View>
          )}

          {isSignUp && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(null);
                }}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              placeholder="Enter your email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              editable={!isLoading}
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-base text-slate-900"
              editable={!isLoading}
            />
          </View>

          <Pressable
            onPress={isSignUp ? handleSignUp : handleSignIn}
            disabled={isLoading}
            className={`rounded-xl py-4 items-center ${
              isLoading ? "bg-teal-400" : "bg-teal-600 active:bg-teal-700"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            disabled={isLoading}
            className="items-center py-4"
          >
            <Text className="text-teal-600 text-sm font-medium">
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
