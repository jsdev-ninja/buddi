import { buddiColors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type DiscoverFilterState = {
	distanceKm: number;
	lookingFor: "all" | "female" | "male" | "group";
	activityType: string;
	ageMin: number;
	ageMax: number;
	verifiedOnly: boolean;
};

const DEFAULT_FILTER: DiscoverFilterState = {
	distanceKm: 50,
	lookingFor: "all",
	activityType: "all",
	ageMin: 18,
	ageMax: 99,
	verifiedOnly: false,
};

const LOOKING_FOR_OPTIONS: { value: DiscoverFilterState["lookingFor"]; label: string }[] = [
	{ value: "all", label: "Everyone" },
	{ value: "female", label: "Women" },
	{ value: "male", label: "Men" },
	{ value: "group", label: "Groups only" },
];

const ACTIVITY_TYPES = [
	"all",
	"Trekking & Hiking",
	"Rock Climbing",
	"Camping",
	"Mountaineering",
	"Cycling",
	"Water Sports",
	"Winter Sports",
	"Wildlife Safari",
	"Photography",
	"Cultural Tour",
	"Other",
];

interface DiscoverFilterModalProps {
	visible: boolean;
	onClose: () => void;
	initialFilter: DiscoverFilterState;
	onApply: (filter: DiscoverFilterState) => void;
}

export function DiscoverFilterModal({
	visible,
	onClose,
	initialFilter,
	onApply,
}: DiscoverFilterModalProps) {
	const insets = useSafeAreaInsets();
	const [filter, setFilter] = useState<DiscoverFilterState>(initialFilter);

	React.useEffect(() => {
		if (visible) setFilter(initialFilter);
	}, [visible, initialFilter]);

	const handleApply = () => {
		onApply(filter);
		onClose();
	};

	const handleReset = () => {
		setFilter(DEFAULT_FILTER);
	};

	const sliderMin = 1;
	const sliderMax = 100;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onStartShouldSetResponder={() => true}>
					<View style={styles.handle} />
					<View style={styles.header}>
						<Text style={styles.title}>Filters</Text>
						<TouchableOpacity onPress={onClose} hitSlop={12}>
							<Feather name="x" size={24} color={buddiColors.textPrimary} />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						{/* Distance */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Distance</Text>
							<View style={styles.sliderRow}>
								<Text style={styles.sliderLabel}>Up to {filter.distanceKm} km</Text>
								<Slider
									style={styles.slider}
									minimumValue={sliderMin}
									maximumValue={sliderMax}
									step={1}
									value={filter.distanceKm}
									onValueChange={(v) => setFilter((f) => ({ ...f, distanceKm: Math.round(v) }))}
									minimumTrackTintColor={buddiColors.primary}
									maximumTrackTintColor={buddiColors.surfaceMuted}
									thumbTintColor={buddiColors.primary}
								/>
								<View style={styles.sliderButtons}>
									{[10, 25, 50, 75, 100].map((km) => (
										<TouchableOpacity
											key={km}
											style={[
												styles.chip,
												filter.distanceKm === km && styles.chipActive,
											]}
											onPress={() => setFilter((f) => ({ ...f, distanceKm: km }))}
										>
											<Text
												style={[
													styles.chipText,
													filter.distanceKm === km && styles.chipTextActive,
												]}
											>
												{km} km
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
						</View>

						{/* Looking for */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Looking for</Text>
							<View style={styles.chipRow}>
								{LOOKING_FOR_OPTIONS.map((opt) => (
									<TouchableOpacity
										key={opt.value}
										style={[
											styles.chip,
											filter.lookingFor === opt.value && styles.chipActive,
										]}
										onPress={() => setFilter((f) => ({ ...f, lookingFor: opt.value }))}
									>
										<Text
											style={[
												styles.chipText,
												filter.lookingFor === opt.value && styles.chipTextActive,
											]}
										>
											{opt.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Age range */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Age range</Text>
							<View style={styles.ageRow}>
								<View style={styles.ageInputWrap}>
									<Text style={styles.ageLabel}>Min age</Text>
									<TextInput
										style={styles.ageInput}
										keyboardType="number-pad"
										maxLength={3}
										value={String(filter.ageMin)}
										onChangeText={(v) => {
											const n = parseInt(v, 10);
											if (!isNaN(n) && n >= 1 && n <= 99) setFilter((f) => ({ ...f, ageMin: n }));
											else if (v === '') setFilter((f) => ({ ...f, ageMin: 18 }));
										}}
										placeholder="18"
										placeholderTextColor={buddiColors.textTertiary}
									/>
								</View>
								<View style={styles.ageSeparatorWrap}>
									<Text style={styles.ageSeparator}>–</Text>
								</View>
								<View style={styles.ageInputWrap}>
									<Text style={styles.ageLabel}>Max age</Text>
									<TextInput
										style={styles.ageInput}
										keyboardType="number-pad"
										maxLength={3}
										value={String(filter.ageMax)}
										onChangeText={(v) => {
											const n = parseInt(v, 10);
											if (!isNaN(n) && n >= 1 && n <= 99) setFilter((f) => ({ ...f, ageMax: n }));
											else if (v === '') setFilter((f) => ({ ...f, ageMax: 99 }));
										}}
										placeholder="99"
										placeholderTextColor={buddiColors.textTertiary}
									/>
								</View>
							</View>
						</View>

						{/* Activity type */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Activity type</Text>
							<View style={styles.chipRowWrap}>
								{ACTIVITY_TYPES.map((act) => (
									<TouchableOpacity
										key={act}
										style={[
											styles.chip,
											filter.activityType === act && styles.chipActive,
										]}
										onPress={() => setFilter((f) => ({ ...f, activityType: act }))}
									>
										<Text
											style={[
												styles.chipText,
												filter.activityType === act && styles.chipTextActive,
											]}
										>
											{act === "all" ? "All" : act}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Verified only */}
						<View style={styles.toggleRow}>
							<Text style={styles.toggleLabel}>Verified only</Text>
							<Switch
								value={filter.verifiedOnly}
								onValueChange={(v) => setFilter((f) => ({ ...f, verifiedOnly: v }))}
								trackColor={{ false: buddiColors.surfaceBorder, true: buddiColors.primaryLight }}
								thumbColor={filter.verifiedOnly ? buddiColors.primary : buddiColors.surface}
							/>
						</View>
					</ScrollView>

					<View style={styles.footer}>
						<TouchableOpacity style={styles.resetButton} onPress={handleReset}>
							<Text style={styles.resetButtonText}>Reset</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.applyButton} onPress={handleApply}>
							<Text style={styles.applyButtonText}>Apply filters</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Pressable>
		</Modal>
	);
}

export const defaultDiscoverFilter = DEFAULT_FILTER;

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	sheet: {
		backgroundColor: buddiColors.surface,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: "85%",
	},
	handle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: buddiColors.surfaceBorder,
		alignSelf: "center",
		marginTop: 12,
		marginBottom: 8,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		color: buddiColors.textPrimary,
	},
	scroll: {
		maxHeight: 400,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingBottom: 24,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: buddiColors.textPrimary,
		marginBottom: 12,
	},
	sliderRow: {},
	sliderLabel: {
		fontSize: 14,
		color: buddiColors.textSecondary,
		marginBottom: 4,
	},
	slider: {
		width: "100%",
		height: 40,
		marginBottom: 8,
	},
	sliderButtons: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		direction: "ltr",
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		direction: "ltr",
	},
	chipRowWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		direction: "ltr",
	},
	chip: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: buddiColors.surfaceMuted,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	chipActive: {
		backgroundColor: buddiColors.primaryMuted,
		borderColor: buddiColors.primary,
	},
	chipText: {
		fontSize: 14,
		color: buddiColors.textPrimary,
	},
	chipTextActive: {
		color: buddiColors.primaryDark,
		fontWeight: "600",
	},
	ageRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
		direction: "ltr",
	},
	ageInputWrap: {
		flex: 1,
	},
	ageLabel: {
		fontSize: 13,
		color: buddiColors.textSecondary,
		marginBottom: 6,
	},
	ageInput: {
		backgroundColor: buddiColors.surfaceMuted,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 16,
		color: buddiColors.textPrimary,
		textAlign: "center",
	},
	ageSeparatorWrap: {
		paddingBottom: 10,
	},
	ageSeparator: {
		fontSize: 20,
		color: buddiColors.textSecondary,
	},
	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
	},
	toggleLabel: {
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	footer: {
		flexDirection: "row",
		gap: 12,
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: buddiColors.surfaceBorder,
		direction: "ltr",
	},
	resetButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.surfaceMuted,
		alignItems: "center",
	},
	resetButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: buddiColors.textSecondary,
	},
	applyButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.primary,
		alignItems: "center",
	},
	applyButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
});
