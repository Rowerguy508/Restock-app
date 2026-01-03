import React, { useState } from "react";
import { Pressable, Text, TextInput, View, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "@/lib/authClient";
import { useSession } from "@/lib/useSession";

export default function LoginWithEmailPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

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
      } else {
        setEmail("");
        setPassword("");
        router.back();
      }
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
      } else {
        setEmail("");
        setPassword("");
        setName("");
        router.back();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.back();
    } catch (err) {
      setError("Failed to sign out");
      console.error(err);
    }
  };

  const handleClose = () => {
    router.back();
  };

  // If user is already logged in, show sign out button
  if (session) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        {/* Close Button */}
        <View className="flex-row justify-end px-4 pt-2">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center active:bg-slate-300"
          >
            <X size={22} color="#64748B" />
          </Pressable>
        </View>

        <View className="flex-1 px-6 pt-8">
          <View className="bg-white p-6 rounded-2xl border border-slate-200">
            <Text className="text-lg font-bold text-slate-900 mb-1">Signed in as</Text>
            <Text className="text-base text-slate-900">{session.user.name}</Text>
            <Text className="text-sm text-slate-500">{session.user.email}</Text>
          </View>

          <Pressable
            onPress={handleSignOut}
            className="bg-rose-600 p-4 rounded-xl items-center mt-6 active:bg-rose-700"
          >
            <Text className="text-white font-semibold text-base">Sign Out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Close Button */}
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable
          onPress={handleClose}
          className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center active:bg-slate-300"
        >
          <X size={22} color="#64748B" />
        </Pressable>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 pt-4">
          <Text className="text-2xl font-bold text-slate-900 mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text className="text-slate-500 mb-8">
            {isSignUp
              ? "Sign up to start managing your inventory"
              : "Sign in to continue to ReStocka"}
          </Text>

          {/* Error Message */}
          {error && (
            <View className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
              <Text className="text-rose-700 text-sm">{error}</Text>
            </View>
          )}

          {isSignUp && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">Name</Text>
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
            <Text className="text-sm font-medium text-slate-700 mb-2">Email</Text>
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
            <Text className="text-sm font-medium text-slate-700 mb-2">Password</Text>
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
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
