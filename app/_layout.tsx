import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // ดึง session ปัจจุบัน
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setInitialized(true);
    };
    checkSession();

    // ใช้การประกาศตัวแปร listener แยกออกมาแบบนี้จะปลอดภัยกว่า
    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!initialized) setInitialized(true); // กันพลาด
    });

    return () => {
      // ตรวจสอบว่ามี subscription ก่อนทำการ unsubscribe
      authListener.data.subscription.unsubscribe();
    };
  }, [initialized]);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [session, initialized, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
