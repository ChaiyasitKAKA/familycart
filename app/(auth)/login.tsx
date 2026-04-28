import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "ข้อมูลไม่ครบถ้วน",
        "กรุณากรอกทั้งอีเมลและรหัสผ่านก่อนเข้าสู่ระบบ",
        [{ text: "ตกลง" }],
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          Alert.alert(
            "เข้าสู่ระบบไม่สำเร็จ",
            "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
            [{ text: "ตกลง" }],
          );
        } else {
          Alert.alert("เกิดข้อผิดพลาด", error.message);
        }
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("ขออภัย", "ไม่สามารถเชื่อมต่อกับระบบได้ในขณะนี้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="cart" size={45} color="#fff" />
          </View>
          <Text style={styles.title}>ยินดีต้อนรับ</Text>
          <Text style={styles.subtitle}>
            เข้าสู่ระบบ HomeCart เพื่อจัดการรายการซื้อของ
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* ช่องกรอกรหัสผ่าน */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#2e7d32"
              style={{ marginTop: 20 }}
            />
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/register")}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            ยังไม่มีบัญชีใช่ไหม?{" "}
            <Text style={styles.linkText}>สมัครสมาชิกที่นี่</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f9f9f9",
    padding: 25,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 30 },
  iconCircle: {
    backgroundColor: "#2e7d32",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#1b5e20" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 5, textAlign: "center" },
  form: { width: "100%" },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 5 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  button: {
    backgroundColor: "#2e7d32",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  footer: { marginTop: 30, alignItems: "center" },
  footerText: { fontSize: 14, color: "#666" },
  linkText: { color: "#2e7d32", fontWeight: "bold" },
});
