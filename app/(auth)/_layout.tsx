import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // ปิดแถบด้านบนสำหรับหน้า Login/Register
        contentStyle: { backgroundColor: "#fff" },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
