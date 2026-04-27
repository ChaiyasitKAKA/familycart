// types/database.ts

/**
 * ตาราง Profiles: เก็บข้อมูลส่วนตัวของผู้ใช้งาน
 * เชื่อมโยงกับ auth.users ผ่าน id
 */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

/**
 * ตาราง Families: กลุ่มครอบครัวหรือบ้าน
 */
export interface Family {
  id: string;
  name: string;
  created_at: string;
  created_by: string; // เชื่อมกับ Profile.id
}

/**
 * ตาราง FamilyMembers: ตารางกลางเชื่อมระหว่างคนกับครอบครัว (Many-to-Many)
 */
export interface FamilyMember {
  id: string;
  family_id: string; // เชื่อมกับ Family.id
  user_id: string; // เชื่อมกับ Profile.id
  role: "admin" | "member"; // กำหนดสิทธิ์
  created_at: string;
}

/**
 * ตาราง ShoppingItems: รายการของที่จะซื้อในแต่ละครอบครัว
 */
export interface ShoppingItem {
  id: string;
  family_id: string; // รายการนี้เป็นของครอบครัวไหน
  name: string;
  quantity: number;
  is_bought: boolean;
  added_by: string; // ใครเป็นคนเพิ่ม (Profile.id)
  created_at: string;
}

export type Tables = {
  profiles: Profile;
  families: Family;
  family_members: FamilyMember;
  shopping_items: ShoppingItem;
};
