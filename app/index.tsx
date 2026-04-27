import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  // หน้านี้จะเป็นเพียงทางผ่านเพื่อรอการตรวจสอบ Session ใน _layout.tsx
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
});
