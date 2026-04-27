import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  is_bought: boolean;
}

export default function ListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    getFamilyAndItems();
  }, []);

  // 1. ดึงข้อมูลครอบครัวและรายการของครั้งแรก
  const getFamilyAndItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .single();

      if (memberData) {
        setFamilyId(memberData.family_id);
        fetchItems(memberData.family_id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setLoading(false);
    }
  };

  // 2. ฟังก์ชันดึงรายการของจาก Database
  const fetchItems = async (fId: string) => {
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("family_id", fId)
      .eq("is_bought", false)
      .order("created_at", { ascending: false });

    if (data) setItems(data);
    setLoading(false);
  };

  // 3. ระบบ Real-time: ซิงค์ข้อมูลกับคนในครอบครัวทันที
  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`family-list-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newItem = payload.new as ShoppingItem;
            // ป้องกันการเบิ้ลข้อมูลถ้าเราเป็นคนเพิ่มเอง
            setItems((prev) =>
              prev.find((i) => i.id === newItem.id) ? prev : [newItem, ...prev],
            );
          } else if (payload.eventType === "UPDATE") {
            const updatedItem = payload.new as ShoppingItem;
            if (updatedItem.is_bought) {
              setItems((prev) => prev.filter((i) => i.id !== updatedItem.id));
            } else {
              setItems((prev) =>
                prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
              );
            }
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  const handleAddItem = async () => {
    // 1. เช็คว่าพิมพ์ชื่อของหรือยัง
    if (!newItemName.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณาพิมพ์ชื่อของที่ต้องการซื้อ");
      return;
    }

    // 2. เช็คว่ามี familyId ไหม (ตัวนี้น่าจะเป็นปัญหา)
    if (!familyId) {
      Alert.alert(
        "ไม่พบรหัสครอบครัว",
        "แอปยังดึง ID ครอบครัวไม่ได้ กรุณาลองสลับไปหน้า Home แล้วกลับมาหน้านี้ใหม่",
      );
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่");
        return;
      }

      console.log("กำลังส่งข้อมูล:", {
        name: newItemName,
        familyId,
        userId: user.id,
      });

      const { error } = await supabase.from("shopping_items").insert([
        {
          name: newItemName.trim(),
          family_id: familyId,
          added_by: user.id,
        },
      ]);

      if (error) throw error;

      setNewItemName("");
      Keyboard.dismiss();
    } catch (error: any) {
      console.error("Add Error:", error.message);
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  // 5. ฟังก์ชันติ๊กซื้อแล้ว (Update สถานะ)
  const toggleBought = async (itemId: string) => {
    const { error } = await supabase
      .from("shopping_items")
      .update({ is_bought: true })
      .eq("id", itemId);
    if (error) Alert.alert("Error", error.message);
  };

  // 6. ฟังก์ชันลบรายการทิ้ง
  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("id", itemId);
    if (error) Alert.alert("Error", error.message);
  };

  // 7. ฟังก์ชัน Pull to Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    if (familyId) await fetchItems(familyId);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (!familyId) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>
          กรุณาสร้างหรือเข้าร่วมครอบครัวก่อนใช้งาน
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Input Section */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="เพิ่มของที่ต้องซื้อ..."
          value={newItemName}
          onChangeText={setNewItemName}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Shopping List Section */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2e7d32"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemMain}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleBought(item.id)}
              >
                <Ionicons name="square-outline" size={26} color="#2e7d32" />
              </TouchableOpacity>
              <Text style={styles.itemText}>{item.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => deleteItem(item.id)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={22} color="#ff4444" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={50} color="#ddd" />
            <Text style={styles.emptyText}>ไม่มีรายการของที่ต้องซื้อ</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f7",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 18,
    fontSize: 16,
    height: 55,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButton: {
    backgroundColor: "#2e7d32",
    width: 55,
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    elevation: 4,
  },
  listPadding: {
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  itemMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    marginRight: 15,
  },
  itemText: {
    fontSize: 17,
    color: "#333",
    fontWeight: "500",
  },
  deleteBtn: {
    padding: 5,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    textAlign: "center",
    color: "#aaa",
    marginTop: 15,
    fontSize: 16,
  },
});
