import { COUNTRIES, GENDER_OPTIONS, ONBOARDING_INTERESTS, PROFILE_KIND_OPTIONS } from "@/constants/onboarding";
import { buddiColors } from "@/constants/theme";
import { t } from "@/lib/i18n/strings";
import { useAuth } from "@/context/AuthProvider";
import { profileInputSchema } from "@/entities/profile";
import { firebaseApi } from "@/services/firebase";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const TOTAL_STEPS = 4;

function getAgeFromBirthday(birthdayMs: number): number {
	const now = Date.now();
	const age = Math.floor((now - birthdayMs) / (365.25 * 24 * 60 * 60 * 1000));
	return Math.max(0, Math.min(120, age));
}

export default function OnboardingScreen() {
	const { user } = useAuth();
	const [step, setStep] = useState(0);
	const [saving, setSaving] = useState(false);

	// Step 0
	const [kind, setKind] = useState<"solo" | "couple">("solo");

	// Step 1
	const [name, setName] = useState("");
	const [partnerName, setPartnerName] = useState("");
	const [partnerAge, setPartnerAge] = useState("");
	const [birthdayText, setBirthdayText] = useState("");
	const [birthdayMs, setBirthdayMs] = useState<number | null>(null);
	const [gender, setGender] = useState("");
	const [genderModalOpen, setGenderModalOpen] = useState(false);
	const [countryModalOpen, setCountryModalOpen] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [birthdayDate, setBirthdayDate] = useState<Date>(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 25);
		return d;
	});

	// Step 2
	const [mainPhotoUri, setMainPhotoUri] = useState<string | null>(null);

	// Step 3
	const [photos, setPhotos] = useState<string[]>([]);
	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [adventurePlan, setAdventurePlan] = useState("");
	const [country, setCountry] = useState("");

	// Step 4
	const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

	const allPhotos = mainPhotoUri ? [mainPhotoUri, ...photos] : photos;
	const mainPhoto = mainPhotoUri ?? photos[0] ?? null;

	const pickMainPhoto = useCallback(async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert("Permission Required", "We need camera roll access to add your photo.");
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});
		if (!result.canceled && result.assets[0]) {
			setMainPhotoUri(result.assets[0].uri);
		}
	}, []);

	const addExtraPhoto = useCallback(async () => {
		if (photos.length >= 5) return;
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert("Permission Required", "We need camera roll access to add photos.");
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});
		if (!result.canceled && result.assets[0]) {
			setPhotos((prev) => [...prev, result.assets[0].uri]);
		}
	}, [photos.length]);

	const removeExtraPhoto = useCallback((index: number) => {
		setPhotos((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const toggleInterest = useCallback((interest: string) => {
		setSelectedInterests((prev) => {
			if (prev.includes(interest)) return prev.filter((i) => i !== interest);
			if (prev.length >= 5) return prev;
			return [...prev, interest];
		});
	}, []);

	const onBirthdayChange = (_event: unknown, selectedDate?: Date) => {
		if (Platform.OS === "android") setShowDatePicker(false);
		if (selectedDate) {
			setBirthdayDate(selectedDate);
			const ms = selectedDate.getTime();
			setBirthdayMs(ms);
			setBirthdayText(selectedDate.toISOString().slice(0, 10));
		}
	};

	const age = birthdayMs != null ? getAgeFromBirthday(birthdayMs) : 0;
	const isAgeValid = age >= 18;
	const partnerAgeNum = partnerAge.trim() !== "" ? Number(partnerAge) : NaN;
	const isPartnerAgeValid = !isNaN(partnerAgeNum) && partnerAgeNum >= 18;
	const coupleFieldsValid = kind !== "couple" || (partnerName.trim().length > 0 && isPartnerAgeValid);
	const canNextStep1 = name.trim().length > 0 && birthdayMs != null && gender.length > 0 && isAgeValid && coupleFieldsValid;
	const canNextStep2 = !!mainPhoto;
	const canFinish = selectedInterests.length > 0;

	const handleNext = () => {
		if (step === 0) {
			setStep(1);
			return;
		}
		if (step === 1) {
			if (!isAgeValid) {
				Alert.alert(
					"Age requirement",
					"You must be 18 or older to use Buddia. Please enter a valid birth date."
				);
				return;
			}
		}
		if (step < TOTAL_STEPS) setStep(step + 1);
	};

	const handleFinish = async () => {
		if (!user || !mainPhoto) return;
		setSaving(true);
		try {
			const userId = user.uid;
			const urisToUpload = mainPhotoUri ? [mainPhotoUri, ...photos] : [...photos];
			const uploadedUrls: string[] = [];
			for (let i = 0; i < urisToUpload.length; i++) {
				const url = await firebaseApi.storage.uploadPhoto(urisToUpload[i], userId, i);
				uploadedUrls.push(url);
			}
			const bday = birthdayMs ?? (birthdayText.trim() ? new Date(birthdayText).getTime() : undefined);
			const age = bday != null ? getAgeFromBirthday(bday) : undefined;
			const coupleFields = kind === "couple"
				? { partnerName: partnerName.trim(), partnerAge: Number(partnerAge) }
				: {};
			if (kind === "couple") {
				const coupleValidation = profileInputSchema
					.pick({ partnerName: true, partnerAge: true })
					.safeParse({ partnerName: partnerName.trim(), partnerAge: Number(partnerAge) });
				if (!coupleValidation.success) {
					Alert.alert("Invalid partner details", coupleValidation.error.issues[0]?.message ?? "Please check partner name and age.");
					return;
				}
			}
			await firebaseApi.profiles.create({
				type: "profile",
				userId,
				name: name.trim(),
				age: age ?? undefined,
				birthday: bday ?? undefined,
				gender: gender || undefined,
				photos: uploadedUrls,
				bio: bio.trim() || undefined,
				location: location.trim() || undefined,
				adventurePlan: adventurePlan.trim() || undefined,
				country: country || undefined,
				interests: selectedInterests,
				kind,
				...coupleFields,
			});
			router.replace("/(tabs)");
		} catch (e) {
			console.error("Onboarding save error:", e);
			Alert.alert("Error", "Could not save your profile. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Step 0: Profile type selector */}
				{step === 0 && (
					<View style={styles.card}>
						<Text style={styles.title}>How are you traveling?</Text>
						<Text style={styles.subtitle}>Tell us how you&apos;d like to present yourself on Buddia.</Text>

						{PROFILE_KIND_OPTIONS.map((opt) => (
							<TouchableOpacity
								key={opt.value}
								style={[styles.kindOption, kind === opt.value && styles.kindOptionSelected]}
								onPress={() => setKind(opt.value)}
								activeOpacity={0.8}
							>
								<Text style={[styles.kindOptionText, kind === opt.value && styles.kindOptionTextSelected]}>
									{t(`onboarding.profileKind.${opt.value}`)}
								</Text>
							</TouchableOpacity>
						))}

						<TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
							<Text style={styles.primaryButtonText}>Continue</Text>
							<Feather name="arrow-right" size={20} color="#fff" />
						</TouchableOpacity>

						<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
							<Feather name="arrow-left" size={18} color={buddiColors.textSecondary} />
							<Text style={styles.backButtonText}>Back</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Step 1: Welcome */}
				{step === 1 && (
					<View style={styles.card}>
						<Text style={styles.title}>Welcome to Buddia!</Text>
						<Text style={styles.subtitle}>Let&apos;s get your profile started. Tell us a bit about yourself.</Text>

						<Text style={styles.label}>What&apos;s your name?</Text>
						<TextInput
							style={styles.input}
							placeholder="Your full name"
							placeholderTextColor={buddiColors.textTertiary}
							value={name}
							onChangeText={setName}
							autoCapitalize="words"
						/>

						<Text style={styles.label}>When&apos;s your birthday?</Text>
						<TouchableOpacity
							style={styles.input}
							onPress={() => setShowDatePicker(true)}
							activeOpacity={0.8}
						>
							<Feather name="calendar" size={20} color={buddiColors.textTertiary} style={styles.inputIcon} />
							<Text style={birthdayMs != null ? styles.inputValue : styles.inputPlaceholder}>
								{birthdayMs != null
									? `${birthdayText} (${age} years old)`
									: "Tap to pick your birth date"}
							</Text>
							<Feather name="chevron-down" size={20} color={buddiColors.textTertiary} />
						</TouchableOpacity>
						{!isAgeValid && birthdayMs != null && (
							<Text style={styles.errorText}>You must be 18 or older to use Buddia.</Text>
						)}
						{showDatePicker && (
							<DateTimePicker
								value={birthdayDate}
								mode="date"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								maximumDate={new Date()}
								minimumDate={new Date(1900, 0, 1)}
								onChange={onBirthdayChange}
							/>
						)}
						{Platform.OS === "ios" && showDatePicker && (
							<View style={styles.datePickerActions}>
								<TouchableOpacity onPress={() => setShowDatePicker(false)}>
									<Text style={styles.datePickerButtonText}>Done</Text>
								</TouchableOpacity>
							</View>
						)}

						<Text style={styles.label}>How do you identify?</Text>
						<TouchableOpacity
							style={styles.input}
							onPress={() => setGenderModalOpen(true)}
							activeOpacity={0.8}
						>
							<Text style={gender ? styles.inputValue : styles.inputPlaceholder}>
								{gender ? GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? gender : "Select your gender"}
							</Text>
							<Feather name="chevron-down" size={20} color={buddiColors.textTertiary} />
						</TouchableOpacity>

						{kind === "couple" && (
							<>
								<Text style={styles.label}>{t("onboarding.partnerName")}</Text>
								<TextInput
									style={styles.input}
									placeholder={t("onboarding.partnerName")}
									placeholderTextColor={buddiColors.textTertiary}
									value={partnerName}
									onChangeText={setPartnerName}
									autoCapitalize="words"
								/>

								<Text style={styles.label}>{t("onboarding.partnerAge")}</Text>
								<TextInput
									style={styles.input}
									placeholder={t("onboarding.partnerAge")}
									placeholderTextColor={buddiColors.textTertiary}
									value={partnerAge}
									onChangeText={setPartnerAge}
									keyboardType="number-pad"
								/>
								{partnerAge.trim() !== "" && !isPartnerAgeValid && (
									<Text style={styles.errorText}>{t("onboarding.partnerAgeError")}</Text>
								)}
							</>
						)}

						<TouchableOpacity
							style={[styles.primaryButton, !canNextStep1 && styles.primaryButtonDisabled]}
							onPress={handleNext}
							disabled={!canNextStep1}
						>
							<Text style={styles.primaryButtonText}>Next</Text>
							<Feather name="arrow-right" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				)}

				{/* Step 2: Upload profile photo */}
				{step === 2 && (
					<View style={styles.card}>
						<Text style={styles.title}>Upload a Profile Photo</Text>
						<Text style={styles.subtitle}>
							Let&apos;s start with your main photo. You can add more in the next step.
						</Text>

						<Pressable style={styles.photoCircle} onPress={pickMainPhoto}>
							{mainPhoto ? (
								<Image source={{ uri: mainPhoto }} style={styles.photoCircleImage} />
							) : (
								<Feather name="camera" size={48} color={buddiColors.textTertiary} />
							)}
						</Pressable>

						<TouchableOpacity style={styles.secondaryButton} onPress={pickMainPhoto}>
							<Text style={styles.secondaryButtonText}>Choose Photo</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.primaryButton, !canNextStep2 && styles.primaryButtonDisabled]}
							onPress={handleNext}
							disabled={!canNextStep2}
						>
							<Text style={styles.primaryButtonText}>Next</Text>
							<Feather name="arrow-right" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				)}

				{/* Step 3: Almost there */}
				{step === 3 && (
					<View style={styles.card}>
						<Text style={styles.title}>Almost there!</Text>
						<Text style={styles.subtitle}>Share a bit more to help others connect with you.</Text>

						<Text style={styles.label}>Add more photos</Text>
						<Text style={styles.hint}>Show off your adventures! ({allPhotos.length}/6)</Text>
						<View style={styles.photoGrid}>
							{[0, 1, 2, 3, 4, 5].map((i) => (
								<View key={i} style={styles.photoGridItem}>
									{allPhotos[i] ? (
										<>
											<Image source={{ uri: allPhotos[i] }} style={styles.photoGridImage} />
											{i === 0 && (
												<View style={styles.mainBadge}>
													<Text style={styles.mainBadgeText}>Main</Text>
												</View>
											)}
											{i > 0 && (
												<TouchableOpacity
													style={styles.removePhoto}
													onPress={() => removeExtraPhoto(i - 1)}
												>
													<Feather name="x" size={16} color="#fff" />
												</TouchableOpacity>
											)}
										</>
									) : (
										<TouchableOpacity
											style={styles.photoGridPlaceholder}
											onPress={addExtraPhoto}
										>
											<Feather name="plus" size={24} color={buddiColors.textTertiary} />
										</TouchableOpacity>
									)}
								</View>
							))}
						</View>

						<Text style={styles.label}>{kind === "couple" ? t("profile.aboutUs") : t("profile.aboutMe")}</Text>
						<TextInput
							style={[styles.input, styles.bioInput]}
							placeholder={kind === "couple" ? t("profile.aboutUsPlaceholder") : t("profile.aboutMePlaceholder")}
							placeholderTextColor={buddiColors.textTertiary}
							value={bio}
							onChangeText={setBio}
							multiline
							numberOfLines={4}
						/>

						<Text style={styles.label}>Where are you now?</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. Lisbon, Portugal"
							placeholderTextColor={buddiColors.textTertiary}
							value={location}
							onChangeText={setLocation}
						/>

						<Text style={styles.label}>Where to next?</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. Patagonia, Argentina"
							placeholderTextColor={buddiColors.textTertiary}
							value={adventurePlan}
							onChangeText={setAdventurePlan}
						/>

						<Text style={styles.label}>What&apos;s your country?</Text>
						<TouchableOpacity
							style={styles.input}
							onPress={() => setCountryModalOpen(true)}
							activeOpacity={0.8}
						>
							<Text style={country ? styles.inputValue : styles.inputPlaceholder}>
								{country || "Select your country"}
							</Text>
							<Feather name="chevron-down" size={20} color={buddiColors.textTertiary} />
						</TouchableOpacity>

						<TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
							<Text style={styles.primaryButtonText}>Next</Text>
							<Feather name="arrow-right" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				)}

				{/* Step 4: Interests */}
				{step === 4 && (
					<View style={styles.card}>
						<Text style={styles.title}>What are your interests?</Text>
						<Text style={styles.subtitle}>
							Choose up to 5 to help us find the best travel buddies for you. ({selectedInterests.length}/5
							selected)
						</Text>

						<View style={styles.interestGrid}>
							{ONBOARDING_INTERESTS.map((interest) => {
								const selected = selectedInterests.includes(interest);
								return (
									<TouchableOpacity
										key={interest}
										style={[styles.interestChip, selected && styles.interestChipSelected]}
										onPress={() => toggleInterest(interest)}
										activeOpacity={0.8}
									>
										<Text style={[styles.interestChipText, selected && styles.interestChipTextSelected]}>
											{interest}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						<TouchableOpacity
							style={[styles.primaryButton, styles.finishButton, (!canFinish || saving) && styles.primaryButtonDisabled]}
							onPress={handleFinish}
							disabled={!canFinish || saving}
						>
							<Text style={styles.primaryButtonText}>{saving ? "Saving…" : "Finish & Start Exploring"}</Text>
							<Feather name="compass" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				)}
			</ScrollView>

			{/* Progress dots */}
			<View style={styles.dots}>
				{Array.from({ length: TOTAL_STEPS }).map((_, i) => (
					<View
						key={i}
						style={[styles.dot, i + 1 === step && styles.dotActive, i + 1 < step && styles.dotDone]}
					/>
				))}
			</View>

			{/* Gender modal */}
			<Modal visible={genderModalOpen} transparent animationType="fade">
				<Pressable style={styles.modalOverlay} onPress={() => setGenderModalOpen(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select your gender</Text>
						{GENDER_OPTIONS.map((opt) => (
							<TouchableOpacity
								key={opt.value}
								style={styles.modalOption}
								onPress={() => {
									setGender(opt.value);
									setGenderModalOpen(false);
								}}
							>
								<Text style={styles.modalOptionText}>{opt.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				</Pressable>
			</Modal>

			{/* Country modal */}
			<Modal visible={countryModalOpen} transparent animationType="fade">
				<Pressable style={styles.modalOverlay} onPress={() => setCountryModalOpen(false)}>
					<View style={[styles.modalContent, styles.countryModalContent]}>
						<Text style={styles.modalTitle}>Select your country</Text>
						<ScrollView style={styles.countryScroll}>
							{COUNTRIES.map((c) => (
								<TouchableOpacity
									key={c}
									style={styles.modalOption}
									onPress={() => {
										setCountry(c);
										setCountryModalOpen(false);
									}}
								>
									<Text style={styles.modalOptionText}>{c}</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				</Pressable>
			</Modal>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: buddiColors.background,
	},
	scrollContent: {
		paddingHorizontal: 24,
		paddingTop: 48,
		paddingBottom: 100,
	},
	card: {
		backgroundColor: buddiColors.surface,
		borderRadius: 16,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 3,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: buddiColors.textPrimary,
		marginBottom: 8,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 15,
		color: buddiColors.textSecondary,
		marginBottom: 24,
		textAlign: "center",
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
		color: buddiColors.textPrimary,
		marginBottom: 8,
	},
	hint: {
		fontSize: 12,
		color: buddiColors.textTertiary,
		marginBottom: 12,
	},
	errorText: {
		fontSize: 13,
		color: buddiColors.dangerText,
		marginBottom: 12,
	},
	datePickerActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		marginBottom: 16,
	},
	datePickerButtonText: {
		fontSize: 16,
		color: buddiColors.primary,
		fontWeight: "600",
	},
	input: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: buddiColors.surfaceMuted,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginBottom: 16,
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	inputIcon: {
		position: "absolute",
		left: 16,
		zIndex: 1,
	},
	inputWithIcon: {
		paddingLeft: 48,
	},
	inputValue: {
		flex: 1,
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	inputPlaceholder: {
		flex: 1,
		fontSize: 16,
		color: buddiColors.textTertiary,
	},
	bioInput: {
		minHeight: 100,
		textAlignVertical: "top",
		paddingTop: 14,
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: buddiColors.primary,
		paddingVertical: 16,
		borderRadius: 12,
		marginTop: 8,
		gap: 8,
	},
	primaryButtonDisabled: {
		backgroundColor: buddiColors.surfaceBorder,
		opacity: 0.8,
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	finishButton: {
		marginTop: 24,
	},
	secondaryButton: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: buddiColors.surface,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingVertical: 14,
		marginBottom: 16,
	},
	secondaryButtonText: {
		fontSize: 16,
		color: buddiColors.textPrimary,
		fontWeight: "500",
	},
	photoCircle: {
		width: 160,
		height: 160,
		borderRadius: 80,
		backgroundColor: buddiColors.surfaceMuted,
		alignSelf: "center",
		justifyContent: "center",
		alignItems: "center",
		marginVertical: 24,
		overflow: "hidden",
	},
	photoCircleImage: {
		width: 160,
		height: 160,
		borderRadius: 80,
	},
	photoGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
		marginBottom: 20,
	},
	photoGridItem: {
		width: "30%",
		aspectRatio: 1,
		borderRadius: 12,
		overflow: "hidden",
		backgroundColor: buddiColors.surfaceMuted,
		borderWidth: 1,
		borderStyle: "dashed",
		borderColor: buddiColors.surfaceBorder,
	},
	photoGridImage: {
		width: "100%",
		height: "100%",
		borderRadius: 12,
	},
	photoGridPlaceholder: {
		flex: 1,
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	mainBadge: {
		position: "absolute",
		bottom: 6,
		left: 6,
		backgroundColor: buddiColors.primary,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	mainBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	removePhoto: {
		position: "absolute",
		top: 6,
		right: 6,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	interestGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		marginBottom: 24,
	},
	interestChip: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: buddiColors.surfaceMuted,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	interestChipSelected: {
		backgroundColor: buddiColors.primaryMuted,
		borderColor: buddiColors.primary,
	},
	interestChipText: {
		fontSize: 14,
		color: buddiColors.textPrimary,
	},
	interestChipTextSelected: {
		color: buddiColors.primaryDark,
		fontWeight: "600",
	},
	dots: {
		position: "absolute",
		bottom: 40,
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: buddiColors.surfaceBorder,
	},
	dotActive: {
		backgroundColor: buddiColors.primary,
		transform: [{ scale: 1.2 }],
	},
	dotDone: {
		backgroundColor: buddiColors.primary,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	modalContent: {
		backgroundColor: buddiColors.surface,
		borderRadius: 16,
		padding: 20,
		width: "100%",
		maxWidth: 340,
		maxHeight: "70%",
	},
	countryModalContent: {
		maxHeight: "80%",
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: buddiColors.textPrimary,
		marginBottom: 16,
		textAlign: "center",
	},
	modalOption: {
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 10,
	},
	modalOptionText: {
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	countryScroll: {
		maxHeight: 400,
	},
	kindOption: {
		paddingVertical: 18,
		paddingHorizontal: 20,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: buddiColors.surfaceBorder,
		marginBottom: 12,
		alignItems: "center",
	},
	kindOptionSelected: {
		borderColor: buddiColors.primary,
		backgroundColor: buddiColors.primaryMuted,
	},
	kindOptionText: {
		fontSize: 16,
		fontWeight: "600",
		color: buddiColors.textPrimary,
	},
	kindOptionTextSelected: {
		color: buddiColors.primary,
	},
	backButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 12,
		gap: 6,
	},
	backButtonText: {
		fontSize: 15,
		color: buddiColors.textSecondary,
	},
});
