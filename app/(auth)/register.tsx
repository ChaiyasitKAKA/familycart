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
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert(
        "ข้อมูลไม่ครบถ้วน",
        "กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบถ้วน",
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "รหัสผ่านสั้นเกินไป",
        "กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร",
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: { display_name: fullName.trim() },
        },
      });

      if (error) {
        if (error.message === "User already registered") {
          Alert.alert(
            "ลงทะเบียนไม่สำเร็จ",
            "อีเมลนี้ถูกใช้งานไปแล้ว กรุณาใช้ีเมลอื่นหรือไปที่หน้าเข้าสู่ระบบ",
            [{ text: "ตกลง" }],
          );
        } else if (error.message.includes("valid email")) {
          Alert.alert("รูปแบบอีเมลผิด", "กรุณากรอกรูปแบบอีเมลให้ถูกต้อง");
        } else {
          Alert.alert("เกิดข้อผิดพลาด", error.message);
        }
        return;
      }

      if (data?.user) {
        Alert.alert(
          "สำเร็จ!",
          "สร้างบัญชีเรียบร้อยแล้ว \n(กรุณาตรวจสอบอีเมลเพื่อยืนยันตนหากระบบต้องการ)",
          [
            {
              text: "ไปหน้าล็อกอิน",
              onPress: () => router.replace("/(auth)/login"),
            },
          ],
        );
      }
    } catch (error: any) {
      Alert.alert("ขออภัย", "ระบบขัดข้องชั่วคราว ไม่สามารถลงทะเบียนได้");
      console.error("Registration Error:", error);
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
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

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
                placeholder="อย่างน้อย 6 ตัวอักษร"
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
