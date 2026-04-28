import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router"; // สำคัญ: ต้องมี useFocusEffect
import React, { useCallback, useEffect, useState } from "react"; // สำคัญ: ต้องมี useCallback

import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

export default function SettingScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinId, setJoinId] = useState("");

  // --- 🛠️ แก้ปัญหาการกด Tab แล้วข้อมูลไม่อัปเดต ---
  useFocusEffect(
    useCallback(() => {
      fetchFullData();
    }, []),
  );

  useEffect(() => {
    const channel = supabase
      .channel("family-members-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_members" },
        () => {
          fetchFullData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFullData();
    setRefreshing(false);
  };

  const fetchFullData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setProfile(user);

      const { data: memberData } = await supabase
        .from("family_members")
        .select(`family_id, families ( id, name )`)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData && memberData.families) {
        // @ts-ignore
        setFamilyData(memberData.families);

        const { data: allMembers } = await supabase
          .from("family_members")
          .select(`user_id, role, profiles ( display_name )`)
          .eq("family_id", memberData.family_id);

        if (allMembers) setMembers(allMembers);
      } else {
        setFamilyData(null);
        setMembers([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = (targetUserId: string, targetName: string) => {
    const myRole = members.find((m) => m.user_id === profile?.id)?.role;

    if (myRole !== "admin") {
      Alert.alert("สิทธิ์ไม่เพียงพอ", "เฉพาะหัวหน้าเท่านั้นที่ลบสมาชิกได้");
      return;
    }

    Alert.alert(
      "ยืนยันการลบสมาชิก",
      `คุณต้องการลบคุณ ${targetName} ออกจากครอบครัว?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบออก",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("family_members")
              .delete()
              .eq("user_id", targetUserId)
              .eq("family_id", familyData.id);

            if (!error) {
              Alert.alert("สำเร็จ", "ลบสมาชิกเรียบร้อยแล้ว");
              fetchFullData();
            }
          },
        },
      ],
    );
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) return;
    try {
      const { data: fData, error: fError } = await supabase
        .from("families")
        .insert([{ name: familyName.trim(), created_by: profile.id }])
        .select()
        .single();

      if (fError) throw fError;

      await supabase
        .from("family_members")
        .insert([{ family_id: fData.id, user_id: profile.id, role: "admin" }]);

      setIsCreateModalVisible(false);
      setFamilyName("");
      fetchFullData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinId.trim()) return;
    try {
      const { data: family } = await supabase
        .from("families")
        .select("id")
        .eq("id", joinId.trim())
        .single();
      if (!family) throw new Error("ไม่พบรหัสครอบครัวนี้");

      await supabase
        .from("family_members")
        .insert([
          { family_id: family.id, user_id: profile.id, role: "member" },
        ]);

      setIsJoinModalVisible(false);
      setJoinId("");
      fetchFullData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert("ยืนยัน", "ออกจากระบบใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ออกจากระบบ",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );

  const amIAdmin =
    members.find((m) => m.user_id === profile?.id)?.role === "admin";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.headerTitle}>การตั้งค่า</Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.email?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ marginLeft: 15 }}>
          <Text style={styles.profileName}>
            {profile?.user_metadata?.display_name || "สมาชิก"}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>จัดการครอบครัว</Text>

      {familyData ? (
        <View style={styles.card}>
          <Text style={styles.label}>ชื่อกลุ่ม</Text>
          <Text style={styles.familyName}>{familyData.name}</Text>
          <View style={styles.divider} />

          <Text style={styles.label}>รหัสครอบครัว (Family ID)</Text>
          <View style={styles.idContainer}>
            <Text style={styles.idText} numberOfLines={1}>
              {familyData.id}
            </Text>
            <TouchableOpacity
              onPress={() => {
                Clipboard.setStringAsync(familyData.id);
                Alert.alert("คัดลอกแล้ว");
              }}
            >
              <Ionicons name="copy-outline" size={20} color="#2e7d32" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          <Text style={styles.label}>สมาชิกในบ้าน ({members.length})</Text>
          {members.map((m, index) => (
            <View key={index} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Ionicons name="person" size={16} color="#2e7d32" />
              </View>
              <Text style={styles.memberName}>
                {m.profiles?.display_name || "ไม่มีชื่อ"}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  m.role === "admin" ? styles.adminBadge : styles.memberBadge,
                ]}
              >
                <Text style={styles.roleText}>
                  {m.role === "admin" ? "หัวหน้า" : "สมาชิก"}
                </Text>
              </View>
              {amIAdmin && m.user_id !== profile?.id && (
                <TouchableOpacity
                  onPress={() =>
                    handleKickMember(m.user_id, m.profiles?.display_name)
                  }
                  style={styles.kickBtn}
                >
                  <Ionicons name="close-circle" size={22} color="#D32F2F" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>คุณยังไม่มีครอบครัว</Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Text style={styles.btnText}>สร้างครอบครัวใหม่</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => setIsJoinModalVisible(true)}
          >
            <Text style={styles.btnTextSecondary}>เข้าร่วมด้วยรหัส</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>

      {/* Modals: Create & Join */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ตั้งชื่อครอบครัว</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น บ้านแสนสุข"
              value={familyName}
              onChangeText={setFamilyName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={styles.modalBtn}
              >
                <Text>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateFamily}
                style={[styles.modalBtn, styles.btnConfirm]}
              >
                <Text style={{ color: "#fff" }}>สร้าง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isJoinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เข้าร่วมด้วยรหัส</Text>
            <TextInput
              style={styles.input}
              placeholder="รหัสครอบครัว"
              value={joinId}
              onChangeText={setJoinId}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsJoinModalVisible(false)}
                style={styles.modalBtn}
              >
                <Text>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleJoinFamily}
                style={[styles.modalBtn, styles.btnConfirm]}
              >
                <Text style={{ color: "#fff" }}>เข้าร่วม</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1b5e20",
    marginTop: 60,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2e7d32",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  profileName: { fontSize: 18, fontWeight: "bold", color: "#333" },
  profileEmail: { fontSize: 14, color: "#888" },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    marginLeft: 5,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    elevation: 3,
  },
  label: { fontSize: 12, color: "#999", marginBottom: 5 },
  familyName: { fontSize: 20, fontWeight: "bold", color: "#2e7d32" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 15 },
  idContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  idText: { flex: 1, fontSize: 12, color: "#666", fontFamily: "monospace" },
  memberRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberName: { flex: 1, fontSize: 15, color: "#333" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  adminBadge: { backgroundColor: "#FFF3E0" },
  memberBadge: { backgroundColor: "#F5F5F5" },
  roleText: { fontSize: 11, color: "#666", fontWeight: "bold" },
  kickBtn: { marginLeft: 10, padding: 5 },
  emptyText: { textAlign: "center", color: "#999", marginBottom: 20 },
  btnPrimary: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  btnSecondary: {
    borderWidth: 1,
    borderColor: "#2e7d32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnTextSecondary: { color: "#2e7d32", fontWeight: "bold" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    padding: 15,
    marginBottom: 50,
  },
  logoutText: {
    color: "#D32F2F",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end" },
  modalBtn: { padding: 12, marginLeft: 10 },
  btnConfirm: {
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    paddingHorizontal: 25,
  },
});
