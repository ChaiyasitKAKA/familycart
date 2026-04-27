import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { Profile } from "../../types";

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // States สำหรับ Create Family
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [creating, setCreating] = useState(false);

  // States สำหรับ Join Family
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. ดึงข้อมูล Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      // 2. เช็คว่า User อยู่ในครอบครัวไหนหรือยัง
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasFamily(!!familyMember);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ฟังก์ชันสร้างครอบครัวใหม่ ---
  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อครอบครัว");
      return;
    }
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: familyData, error: fError } = await supabase
        .from("families")
        .insert([{ name: familyName.trim() }])
        .select()
        .single();

      if (fError) throw fError;

      const { error: mError } = await supabase
        .from("family_members")
        .insert([
          { family_id: familyData.id, user_id: user?.id, role: "admin" },
        ]);

      if (mError) throw mError;

      Alert.alert("สำเร็จ!", `สร้างครอบครัว ${familyName} เรียบร้อยแล้ว`);
      setIsCreateModalVisible(false);
      setFamilyName("");
      fetchUserData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setCreating(false);
    }
  };

  // --- ฟังก์ชันเข้าร่วมครอบครัวเดิม ---
  const handleJoinFamily = async () => {
    if (!joinId.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกรหัสครอบครัว");
      return;
    }
    setJoining(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // ตรวจสอบว่ารหัสครอบครัวมีจริงไหม
      const { data: family, error: fError } = await supabase
        .from("families")
        .select("id, name")
        .eq("id", joinId.trim())
        .single();

      if (fError || !family) throw new Error("ไม่พบรหัสครอบครัวนี้");

      const { error: jError } = await supabase
        .from("family_members")
        .insert([{ family_id: family.id, user_id: user?.id, role: "member" }]);

      if (jError) throw jError;

      Alert.alert("สำเร็จ!", `คุณได้เข้าร่วมครอบครัว ${family.name} แล้ว`);
      setIsJoinModalVisible(false);
      setJoinId("");
      fetchUserData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setJoining(false);
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
    <ScrollView style={styles.container}>
      <Text style={styles.welcome}>สวัสดีครับ,</Text>
      <Text style={styles.name}>
        {profile?.display_name || "สมาชิก HomeCart"}
      </Text>

      {hasFamily ? (
        <View style={styles.card}>
          <Ionicons
            name="checkmark-circle"
            size={40}
            color="#2e7d32"
            style={{ marginBottom: 10 }}
          />
          <Text style={styles.cardTitle}>ครอบครัวของคุณพร้อมใช้งานแล้ว</Text>
          <Text style={styles.cardSub}>
            ไปที่เมนู รายการซื้อ เพื่อเพิ่มของกินของใช้ได้เลย!
          </Text>
        </View>
      ) : (
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.cardTitle}>คุณยังไม่มีกลุ่มครอบครัว</Text>
          <Text style={styles.cardSub}>
            เลือกสร้างกลุ่มใหม่เพื่อเป็นหัวหน้าครอบครัว
            หรือนำรหัสจากคนในบ้านมาเข้าร่วมกลุ่มเดิม
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Text style={styles.buttonText}>สร้างครอบครัวใหม่</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={() => setIsJoinModalVisible(true)}
          >
            <Text style={styles.joinButtonText}>เข้าร่วมด้วยรหัสครอบครัว</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal: Create Family */}
      <Modal visible={isCreateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ระบุชื่อครอบครัว</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น บ้านแสนสุข, หอพัก 402"
              value={familyName}
              onChangeText={setFamilyName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={[styles.modalBtn, styles.cancelBtn]}
              >
                <Text>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateFamily}
                style={[styles.modalBtn, styles.confirmBtn]}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>สร้าง</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Join Family */}
      <Modal visible={isJoinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เข้าร่วมครอบครัว</Text>
            <Text style={styles.modalSubText}>
              วางรหัส (Family ID) ที่ได้รับจากสมาชิกในบ้าน
            </Text>
            <TextInput
              style={styles.input}
              placeholder="วางรหัส UUID ที่นี่..."
              value={joinId}
              onChangeText={setJoinId}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsJoinModalVisible(false)}
                style={[styles.modalBtn, styles.cancelBtn]}
              >
                <Text>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleJoinFamily}
                style={[styles.modalBtn, styles.confirmBtn]}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>เข้าร่วม</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        onPress={() => supabase.auth.signOut()}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 25,
    paddingTop: 60,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcome: { fontSize: 18, color: "#666" },
  name: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1b5e20",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  warningCard: { borderLeftWidth: 5, borderLeftColor: "#fbc02d" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  cardSub: { fontSize: 14, color: "#666", marginBottom: 20, lineHeight: 20 },
  button: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  joinButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2e7d32",
    marginTop: 12,
  },
  joinButtonText: { color: "#2e7d32", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalSubText: { fontSize: 13, color: "#888", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end" },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelBtn: { backgroundColor: "#eee" },
  confirmBtn: { backgroundColor: "#2e7d32" },
  confirmText: { color: "#fff", fontWeight: "bold" },
  logoutButton: { marginTop: 40, alignItems: "center", marginBottom: 50 },
  logoutText: { color: "#d32f2f", fontWeight: "600" },
});
