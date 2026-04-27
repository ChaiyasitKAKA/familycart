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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: { display_name: fullName },
        },
      });

      if (error) throw error;

      // ตรวจสอบว่ามี user object กลับมาจริงๆ
      if (data?.user) {
        Alert.alert("สำเร็จ!", "บัญชีของคุณถูกสร้างแล้ว", [
          {
            text: "ไปหน้าล็อกอิน",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]);
      } else {
        // กรณีไม่มี error แต่ user ไม่มา (เช่น ต้องยืนยันเมลก่อนแต่เราลืมปิด confirm email)
        Alert.alert(
          "แจ้งเตือน",
          "สมัครสำเร็จแล้ว แต่อาจต้องยืนยันอีเมลก่อนเข้าใช้งาน",
        );
      }
    } catch (error: any) {
      console.log("DEBUG:", error.message);
      Alert.alert("เกิดข้อผิดพลาด", error.message);
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
            <Ionicons name="person-add" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>สร้างบัญชี HomeCart</Text>
          <Text style={styles.subtitle}>
            จัดการรายการซื้อของร่วมกับครอบครัว
          </Text>
        </View>

        <View style={styles.form}>
          {/* ช่องกรอกชื่อ (สำหรับ Profiles Table) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อ-นามสกุล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="สมชาย พุ่มเผื่อน"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* ช่องกรอกอีเมล */}
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
                placeholder="example@mail.com"
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
                placeholder="อย่างน้อย 6 ตัวอักษรขึ้นไป"
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
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.buttonText}>ลงทะเบียน</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(auth)/login");
            }
          }}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            มีบัญชีอยู่แล้ว? <Text style={styles.linkText}>เข้าสู่ระบบ</Text>
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
  subtitle: { fontSize: 16, color: "#666", marginTop: 5 },
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
  footer: { marginTop: 20, alignItems: "center" },
  footerText: { fontSize: 14, color: "#666" },
  linkText: { color: "#2e7d32", fontWeight: "bold" },
});
