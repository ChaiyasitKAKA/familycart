import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard"; // สำหรับก๊อปปี้รหัส
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

export default function SettingScreen() {
  const [familyData, setFamilyData] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyInfo();
  }, []);

  const fetchFamilyInfo = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ดึง family_id และชื่อครอบครัวผ่านตาราง members ลากไปที่ families
      const { data, error } = await supabase
        .from("family_members")
        .select(
          `
          family_id,
          families ( id, name )
        `,
        )
        .eq("user_id", user.id)
        .single();

      if (data && data.families) {
        // @ts-ignore
        setFamilyData(data.families);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (familyData) {
      await Clipboard.setStringAsync(familyData.id);
      Alert.alert(
        "คัดลอกแล้ว",
        "ส่งรหัสนี้ให้สมาชิกในครอบครัวเพื่อเข้าร่วมกลุ่ม",
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>ตั้งค่าครอบครัว</Text>

      {familyData ? (
        <View style={styles.card}>
          <Text style={styles.label}>ชื่อครอบครัว</Text>
          <Text style={styles.familyName}>{familyData.name}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>รหัสครอบครัว (Family ID)</Text>
          <View style={styles.idContainer}>
            <Text
              style={styles.idText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {familyData.id}
            </Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
              <Ionicons name="copy-outline" size={20} color="#2e7d32" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            * แชร์รหัสนี้ให้คนในบ้านเพื่อใช้งานร่วมกัน
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            คุณยังไม่มีครอบครัว กรุณาสร้างครอบครัวที่หน้าแรก
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => supabase.auth.signOut()}
      >
        <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f7",
    padding: 25,
    paddingTop: 60,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 25,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  label: { fontSize: 14, color: "#888", marginBottom: 5 },
  familyName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 15,
  },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 15 },
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  idText: { flex: 1, fontSize: 14, color: "#555", fontFamily: "monospace" },
  copyBtn: { marginLeft: 10, padding: 5 },
  hint: { fontSize: 12, color: "#aaa", marginTop: 10, fontStyle: "italic" },
  emptyText: { textAlign: "center", color: "#999" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    padding: 15,
  },
  logoutText: { color: "#ff4444", fontWeight: "bold", marginLeft: 8 },
});
