import { buddiColors } from "@/constants/theme";
import { t } from "@/lib/i18n/strings";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  variant?: "compact" | "full";
};

export function CouplePill({ variant = "full" }: Props) {
  const isCompact = variant === "compact";
  return (
    <View style={[styles.pill, isCompact ? styles.compact : styles.full]}>
      <Feather name="heart" size={isCompact ? 10 : 12} color={buddiColors.primary} />
      <Feather name="users" size={isCompact ? 10 : 12} color={buddiColors.primary} />
      {!isCompact && (
        <Text style={styles.label}>{t("profile.couplePillLabel")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: buddiColors.primaryMuted,
    borderRadius: 20,
    gap: 4,
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    height: 18,
  },
  full: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    height: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: buddiColors.primary,
  },
});
