import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rsvps = sqliteTable("rsvps", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  attendance: text("attendance").notNull(),
  guestCount: integer("guest_count").notNull().default(1),
  guestNames: text("guest_names").notNull().default(""),
  dietary: text("dietary").notNull().default(""),
  transport: text("transport").notNull().default("no"),
  song: text("song").notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const giftConfirmations = sqliteTable("gift_confirmations", {
  id: text("id").primaryKey(),
  giftId: text("gift_id").notNull(),
  giftName: text("gift_name").notNull(),
  amount: integer("amount").notNull(),
  giverName: text("giver_name").notNull(),
  email: text("email").notNull(),
  dedication: text("dedication").notNull(),
  status: text("status").notNull().default("transfer_declared"),
  createdAt: text("created_at").notNull(),
});
