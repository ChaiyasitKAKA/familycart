import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router"; // เพิ่ม useFocusEffect
import React, { useCallback, useEffect, useState } from "react"; // เพิ่ม useCallback
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { ShoppingItem } from "../../types";

export default function ListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);

  // --- 1. Auto Refresh ทุกครั้งที่สลับ Tab มาหน้านี้ ---
  useFocusEffect(
    useCallback(() => {
      fetchFamilyAndItems();
    }, []),
  );

  // --- 2. Realtime Subscription ดักฟังข้อมูลสดๆ ---
  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`list-realtime-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `family_id=eq.${familyId}`, // กรองเฉพาะของครอบครัวเรา
        },
        () => {
          fetchItems(familyId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  const fetchFamilyAndItems = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberData } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberData) {
      setFamilyId(memberData.family_id);
      fetchItems(memberData.family_id);
    }
    setLoading(false);
  };

  const fetchItems = async (fId: string) => {
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("family_id", fId)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  };

  const addItem = async () => {
    if (!newItemName.trim() || !familyId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("shopping_items").insert([
      {
        name: newItemName.trim(),
        price: parseFloat(newItemPrice) || 0,
        family_id: familyId,
        added_by: user?.id,
        is_bought: false,
        quantity: 1,
      },
    ]);

    if (!error) {
      setNewItemName("");
      setNewItemPrice("");
      // ไม่ต้องเรียก fetchItems เอง เพราะ Realtime จะจัดการให้
    }
  };

  const toggleBought = async (item: ShoppingItem) => {
    await supabase
      .from("shopping_items")
      .update({ is_bought: !item.is_bought })
      .eq("id", item.id);
    // ข้อมูลจะอัปเดตผ่าน Realtime
  };

  const deleteItem = (id: string) => {
    Alert.alert("ลบ", "ลบสินค้านี้ใช่ไหม?", [
      { text: "ยกเลิก" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          await supabase.from("shopping_items").delete().eq("id", id);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.itemCard, item.is_bought && styles.itemBought]}>
      <TouchableOpacity
        style={styles.checkArea}
        onPress={() => toggleBought(item)}
      >
        <Ionicons
          name={item.is_bought ? "checkbox" : "square-outline"}
          size={28}
          color={item.is_bought ? "#2e7d32" : "#ccc"}
        />
        <View style={styles.itemTextContainer}>
          <Text
            style={[styles.itemName, item.is_bought && styles.textLineThrough]}
          >
            {item.name}
          </Text>
          <Text style={styles.itemPrice}>฿{(item.price || 0).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => deleteItem(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#ff5252" />
      </TouchableOpacity>
    </View>
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Text style={styles.title}>รายการซื้อของ</Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: "#aaa" }}>ไม่มีรายการสินค้า</Text>
          </View>
        }
      />
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="ซื้ออะไร..."
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="ราคา"
            keyboardType="numeric"
            value={newItemPrice}
            onChangeText={setNewItemPrice}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fcfcfc", paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1b5e20",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
  },
  itemBought: { opacity: 0.6, backgroundColor: "#f5f5f5" },
  checkArea: { flex: 1, flexDirection: "row", alignItems: "center" },
  itemTextContainer: { marginLeft: 15 },
  itemName: { fontSize: 17, fontWeight: "500", color: "#333" },
  itemPrice: { fontSize: 13, color: "#666" },
  textLineThrough: { textDecorationLine: "line-through", color: "#aaa" },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: "#2e7d32",
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  emptyContainer: { alignItems: "center", marginTop: 50 },
});
