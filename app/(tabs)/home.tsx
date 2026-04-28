import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router"; // เพิ่ม useFocusEffect
import { useCallback, useEffect, useState } from "react"; // เพิ่ม useCallback
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { Profile } from "../../types";

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ total: 0, bought: 0, pending: 0 });
  const [totalSpent, setTotalSpent] = useState(0);

  // --- ส่วนที่ 1: Auto Refresh เมื่อกดสลับ Tab กลับมาหน้านี้ ---
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  // --- ส่วนที่ 2: Realtime Subscription ดักฟังข้อมูลขณะเปิดหน้าจอนี้ ---
  useEffect(() => {
    const channel = supabase
      .channel("home-refresh-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
        },
        (payload) => {
          console.log("Change detected, refreshing stats...");
          // ถ้ามี familyId อยู่แล้ว ให้ดึงแค่ Stat ใหม่เพื่อประหยัดทรัพยากร
          if (familyId) {
            fetchShoppingStats(familyId);
          } else {
            fetchData();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      const { data: memberData } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData) {
        setFamilyId(memberData.family_id);
        await fetchShoppingStats(memberData.family_id);
      } else {
        setFamilyId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchShoppingStats = async (fId: string) => {
    const { data } = await supabase
      .from("shopping_items")
      .select("is_bought, price, quantity")
      .eq("family_id", fId);
    if (data) {
      const total = data.length;
      const boughtItems = data.filter((i) => i.is_bought);
      const spent = boughtItems.reduce(
        (acc, i) => acc + Number(i.price || 0) * (i.quantity || 1),
        0,
      );
      setSummary({
        total,
        bought: boughtItems.length,
        pending: total - boughtItems.length,
      });
      setTotalSpent(spent);
    }
  };

  const handleLeaveFamily = () => {
    Alert.alert("ออกจากครอบครัว", "ยืนยันการออกจากกลุ่ม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ยืนยัน",
        style: "destructive",
        onPress: async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from("family_members")
            .delete()
            .eq("user_id", user.id);

          if (!error) {
            setFamilyId(null);
            setSummary({ total: 0, bought: 0, pending: 0 });
            setTotalSpent(0);
            fetchData();
          } else {
            Alert.alert("ผิดพลาด", "ไม่สามารถออกจากครอบครัวได้");
          }
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>สวัสดีครับ,</Text>
          <Text style={styles.nameText}>
            {profile?.display_name || "สมาชิก"}
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={26} color="#1b5e20" />
        </TouchableOpacity>
      </View>

      {familyId ? (
        <View>
          <View style={styles.spendingCard}>
            <View>
              <Text style={styles.spendingLabel}>ยอดใช้จ่ายรวมที่ซื้อแล้ว</Text>
              <Text style={styles.spendingAmount}>
                ฿
                {totalSpent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet" size={30} color="#fff" />
            </View>
          </View>
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { borderLeftColor: "#4caf50" }]}>
              <Ionicons
                name="list"
                size={20}
                color="#4caf50"
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>{summary.total}</Text>
              <Text style={styles.statSub}>รายการทั้งหมด</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: "#ff9800" }]}>
              <Ionicons
                name="time"
                size={20}
                color="#ff9800"
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>{summary.pending}</Text>
              <Text style={styles.statSub}>รอดำเนินการ</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: "#2196f3" }]}>
              <Ionicons
                name="checkmark-done"
                size={20}
                color="#2196f3"
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>{summary.bought}</Text>
              <Text style={styles.statSub}>ซื้อแล้ว</Text>
            </View>
          </View>
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(tabs)/list")}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="cart" size={24} color="#2e7d32" />
              </View>
              <Text style={styles.menuText}>รายการซื้อ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLeaveFamily}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#ffebee" }]}>
                <Ionicons name="exit" size={24} color="#d32f2f" />
              </View>
              <Text style={[styles.menuText, { color: "#d32f2f" }]}>
                ออกจากครอบครัว
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="people-circle-outline" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>เข้าร่วมครอบครัวเพื่อเริ่มต้น</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdfd", paddingHorizontal: 22 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 65,
    marginBottom: 30,
  },
  welcomeText: { fontSize: 16, color: "#888" },
  nameText: { fontSize: 30, fontWeight: "bold", color: "#1b5e20" },
  notificationBtn: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
  },
  spendingCard: {
    backgroundColor: "#1b5e20",
    padding: 25,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  spendingLabel: { color: "#a5d6a7", fontSize: 13, fontWeight: "600" },
  spendingAmount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
  },
  iconCircle: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 15,
    borderRadius: 20,
  },
  statsContainer: { marginBottom: 25 },
  statBox: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderLeftWidth: 6,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: { marginRight: 15 },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginRight: 10,
  },
  statSub: { fontSize: 14, color: "#777" },
  menuGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  menuItem: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    marginHorizontal: 6,
    elevation: 2,
  },
  menuIcon: { padding: 12, borderRadius: 16, marginBottom: 10 },
  menuText: { fontSize: 14, fontWeight: "600", color: "#444" },
  emptyCard: { alignItems: "center", marginTop: 60, padding: 40 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
    marginTop: 20,
  },
});
