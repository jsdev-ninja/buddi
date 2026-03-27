import { buddiColors } from '@/constants/theme';
import type { Profile } from '@/entities/profile';
import type { GroupInput } from '@/entities/group';
import { ActivityTypeEnum, DifficultyEnum, groupInputSchema, PrivacyEnum } from '@/entities/group';
import { useAuth } from '@/context/AuthProvider';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

interface CreateGroupModalProps {
	visible: boolean;
	onClose: () => void;
	onSubmit: (data: GroupInput) => void | Promise<void>;
	mode?: 'create' | 'edit';
	initialData?: Partial<GroupInput>;
}

type Step = 1 | 2 | 3;

const ACTIVITY_TYPES = [
	'Trekking & Hiking',
	'Rock Climbing',
	'Camping',
	'Mountaineering',
	'Cycling',
	'Water Sports',
	'Winter Sports',
	'Wildlife Safari',
	'Photography',
	'Cultural Tour',
	'Other',
] as const;

const DIFFICULTY_LEVELS = ['Easy', 'Moderate', 'Hard', 'Expert'] as const;

export function CreateGroupModal({ visible, onClose, onSubmit, mode = 'create', initialData }: CreateGroupModalProps) {
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const [step, setStep] = useState<Step>(1);
	const [formData, setFormData] = useState<Partial<GroupInput>>({
		privacy: 'public',
		tags: [],
		participants: [],
		maxMembers: 10,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [tagInput, setTagInput] = useState('');
	const [matchProfiles, setMatchProfiles] = useState<Profile[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [isLoadingMatches, setIsLoadingMatches] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showStartPicker, setShowStartPicker] = useState(false);
	const [showEndPicker, setShowEndPicker] = useState(false);
	const [startDateObj, setStartDateObj] = useState<Date>(new Date());
	const [endDateObj, setEndDateObj] = useState<Date>(new Date());

	// Fetch matches and their profiles when step 3 is shown (for participant selection)
	const fetchMatchProfiles = useCallback(async () => {
		if (!user?.uid) return;
		try {
			setIsLoadingMatches(true);
			const matches = await firebaseApi.matches.getUserMatches(user.uid);
			const profiles: Profile[] = [];
			for (const m of matches) {
				const profile = await firebaseApi.profiles.getProfile(m.userId);
				if (profile) profiles.push(profile);
			}
			if (mode === 'edit' && initialData?.participants?.length) {
				for (const pid of initialData.participants) {
					if (!profiles.some((p) => p.userId === pid || p.id === pid)) {
						const profile = await firebaseApi.profiles.getProfile(pid);
						if (profile) profiles.push(profile);
					}
				}
			}
			setMatchProfiles(profiles);
		} catch (error) {
			console.error('Error fetching match profiles:', error);
			setMatchProfiles([]);
		} finally {
			setIsLoadingMatches(false);
		}
	}, [user?.uid, mode, initialData?.participants]);

	useEffect(() => {
		if (visible && step === 3 && user?.uid) {
			fetchMatchProfiles();
		} else if (!visible) {
			setMatchProfiles([]);
			setSearchQuery('');
		}
	}, [visible, step, user?.uid, fetchMatchProfiles]);

	// Filter participants by search query (name or location)
	const filteredParticipants = React.useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return matchProfiles;
		return matchProfiles.filter(
			(p) =>
				(p.name?.toLowerCase().includes(q) ?? false) ||
				(p.location?.toLowerCase().includes(q) ?? false) ||
				(p.country?.toLowerCase().includes(q) ?? false)
		);
	}, [matchProfiles, searchQuery]);

	// Reset form when modal closes; when opening in edit mode, seed from initialData
	React.useEffect(() => {
		if (!visible) {
			setStep(1);
			setFormData({
				privacy: 'public',
				tags: [],
				participants: [],
				maxMembers: 10,
			});
			setErrors({});
			setTagInput('');
		} else if (mode === 'edit' && initialData) {
			setFormData((prev) => ({
				...prev,
				...initialData,
				tags: initialData.tags ?? prev.tags,
				participants: initialData.participants ?? prev.participants,
				maxMembers: initialData.maxMembers ?? prev.maxMembers,
				privacy: initialData.privacy ?? prev.privacy,
			}));
			if (initialData.startDate) setStartDateObj(new Date(initialData.startDate));
			if (initialData.endDate) setEndDateObj(new Date(initialData.endDate));
		}
	}, [visible, mode, initialData]);

	const updateField = (field: keyof GroupInput, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: '' }));
	};

	const validateStep = (stepToValidate: Step): boolean => {
		try {
			if (stepToValidate === 1) {
				const step1Schema = z.object({
					groupName: z
						.string()
						.min(1, 'Group name is required')
						.max(100, 'Group name must be less than 100 characters'),
					destination: z
						.string()
						.min(1, 'Destination is required')
						.max(200, 'Destination must be less than 200 characters'),
					description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
					activityType: ActivityTypeEnum.optional(),
					difficulty: DifficultyEnum.optional(),
					tags: z.array(z.string()).optional(),
					privacy: PrivacyEnum.optional(),
				});
				step1Schema.parse(formData);
			} else if (stepToValidate === 2) {
				const step2Schema = z
					.object({
						startDate: z.union([z.string(), z.number()]).optional(),
						endDate: z.union([z.string(), z.number()]).optional(),
						maxMembers: z
							.number()
							.int('Max members must be a whole number')
							.positive('Max members must be greater than 0')
							.max(1000, 'Max members cannot exceed 1000'),
						estimatedCost: z.string().optional(),
						groupPhoto: z.string().optional().nullable(),
					})
					.refine(
						(data) => {
							if (data.startDate && data.endDate) {
								const start = new Date(data.startDate);
								const end = new Date(data.endDate);
								if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
								return end >= start;
							}
							return true;
						},
						{ message: 'End date must be after start date', path: ['endDate'] }
					);
				step2Schema.parse({
					...formData,
					maxMembers: formData.maxMembers ?? 10,
				});
			}
			setErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError && error.issues) {
				const newErrors: Record<string, string> = {};
				error.issues.forEach((issue: z.ZodIssue) => {
					if (issue.path && issue.path.length > 0) {
						newErrors[issue.path[0] as string] = issue.message;
					}
				});
				setErrors(newErrors);
			} else {
				console.error('Validation error:', error);
			}
			return false;
		}
	};

	const handleNext = () => {
		if (step === 3) {
			handleSubmit();
		} else {
			if (!validateStep(step)) return;
			setStep((step + 1) as Step);
			setErrors({});
		}
	};

	const handlePrevious = () => {
		if (step > 1) {
			setStep((step - 1) as Step);
		}
	};

	const handleSubmit = async () => {
		try {
			const dataToValidate = {
				...formData,
				type: 'group' as const,
				tags: formData.tags || [],
				participants: formData.participants || [],
				privacy: formData.privacy || 'public',
				maxMembers: formData.maxMembers || 10,
			};
			const validated = groupInputSchema.parse(dataToValidate);
			setIsSubmitting(true);
			await Promise.resolve(onSubmit(validated));
			Alert.alert('Success', mode === 'edit' ? 'Group updated successfully!' : 'Group created successfully!');
			setStep(1);
			setFormData({
				privacy: 'public',
				tags: [],
				participants: [],
				maxMembers: 10,
			});
			setErrors({});
			setTagInput('');
			onClose();
		} catch (error) {
			if (error instanceof z.ZodError && error.issues) {
				const newErrors: Record<string, string> = {};
				error.issues.forEach((issue: z.ZodIssue) => {
					if (issue.path && issue.path.length > 0) {
						newErrors[issue.path[0] as string] = issue.message;
					}
				});
				setErrors(newErrors);
				if (newErrors.groupName || newErrors.destination || newErrors.description || newErrors.activityType || newErrors.difficulty) {
					setStep(1);
				} else if (newErrors.startDate || newErrors.endDate || newErrors.maxMembers || newErrors.estimatedCost) {
					setStep(2);
				}
			} else {
				const message = error instanceof Error ? error.message : 'Failed to create group. Please try again.';
				Alert.alert('Error', message);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const addTag = () => {
		if (tagInput.trim()) {
			updateField('tags', [...(formData.tags || []), tagInput.trim()]);
			setTagInput('');
		}
	};

	const removeTag = (index: number) => {
		const newTags = formData.tags?.filter((_, i) => i !== index) || [];
		updateField('tags', newTags);
	};

	const addParticipant = (userId: string) => {
		if (!formData.participants?.includes(userId)) {
			updateField('participants', [...(formData.participants || []), userId]);
		}
	};

	const removeParticipant = (userId: string) => {
		const newParticipants = formData.participants?.filter((id) => id !== userId) || [];
		updateField('participants', newParticipants);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
			<View style={[styles.modal, { paddingTop: insets.top }]}>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<Feather name="users" size={24} color={buddiColors.primary} />
							<Text style={styles.title}>{mode === 'edit' ? 'Edit Group' : 'Create Group'}</Text>
						</View>
						<Pressable onPress={onClose} style={styles.closeButton}>
							<Feather name="x" size={24} color={buddiColors.textPrimary} />
						</Pressable>
					</View>

					{/* Step Indicator */}
					<View style={styles.stepIndicator}>
						{[1, 2, 3].map((stepNum) => (
							<React.Fragment key={stepNum}>
								<View
									style={[
										styles.stepCircle,
										stepNum === step && styles.stepCircleActive,
										stepNum < step && styles.stepCircleComplete,
									]}
								>
									{stepNum < step ? (
										<Feather name="check" size={16} color="#fff" />
									) : (
										<Text
											style={[
												styles.stepNumber,
												stepNum === step && styles.stepNumberActive,
											]}
										>
											{stepNum}
										</Text>
									)}
								</View>
								{stepNum < 3 && <View style={styles.stepLine} />}
							</React.Fragment>
						))}
					</View>

					<ScrollView 
						style={styles.content} 
						contentContainerStyle={styles.contentContainer}
						showsVerticalScrollIndicator={false}
					>
						{/* Step 1: Basic Information */}
						{step === 1 && (
							<View style={styles.stepContent}>
								<Text style={styles.sectionTitle}>Basic Information</Text>

								<View style={styles.field}>
									<Text style={styles.label}>Group Name</Text>
									<TextInput
										style={[styles.input, errors.groupName && styles.inputError]}
										placeholder="Enter group name"
										value={formData.groupName || ''}
										onChangeText={(text) => updateField('groupName', text)}
									/>
									{errors.groupName && (
										<Text style={styles.errorText}>{errors.groupName}</Text>
									)}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Destination</Text>
									<TextInput
										style={[styles.input, errors.destination && styles.inputError]}
										placeholder="Where are you going?"
										value={formData.destination || ''}
										onChangeText={(text) => updateField('destination', text)}
									/>
									{errors.destination && (
										<Text style={styles.errorText}>{errors.destination}</Text>
									)}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Description</Text>
									<TextInput
										style={[styles.textArea, errors.description && styles.inputError]}
										placeholder="Tell everyone about your adventure..."
										multiline
										numberOfLines={4}
										value={formData.description || ''}
										onChangeText={(text) => updateField('description', text)}
									/>
									{errors.description && (
										<Text style={styles.errorText}>{errors.description}</Text>
									)}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Activity Type</Text>
									<View style={styles.optionsContainer}>
										{ACTIVITY_TYPES.map((type) => (
											<TouchableOpacity
												key={type}
												style={[
													styles.option,
													formData.activityType === type && styles.optionSelected,
												]}
												onPress={() => updateField('activityType', type)}
											>
												<Text
													style={[
														styles.optionText,
														formData.activityType === type && styles.optionTextSelected,
													]}
												>
													{type}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Difficulty</Text>
									<View style={styles.optionsContainer}>
										{DIFFICULTY_LEVELS.map((level) => (
											<TouchableOpacity
												key={level}
												style={[
													styles.option,
													formData.difficulty === level && styles.optionSelected,
												]}
												onPress={() => updateField('difficulty', level)}
											>
												<Text
													style={[
														styles.optionText,
														formData.difficulty === level && styles.optionTextSelected,
													]}
												>
													{level}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Tags</Text>
									<View style={styles.tagInputContainer}>
										<TextInput
											style={styles.tagInput}
											placeholder="Add a tag..."
											value={tagInput}
											onChangeText={setTagInput}
											onSubmitEditing={addTag}
										/>
										<Pressable style={styles.addTagButton} onPress={addTag}>
											<Text style={styles.addTagButtonText}>Add</Text>
										</Pressable>
									</View>
									{formData.tags && formData.tags.length > 0 && (
										<View style={styles.tagsContainer}>
											{formData.tags.map((tag, index) => (
												<View key={index} style={styles.tag}>
													<Text style={styles.tagText}>{tag}</Text>
													<Pressable onPress={() => removeTag(index)}>
														<Feather name="x" size={14} color={buddiColors.textSecondary} />
													</Pressable>
												</View>
											))}
										</View>
									)}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Group Privacy</Text>
									<View style={styles.privacyContainer}>
										<TouchableOpacity
											style={[
												styles.privacyButton,
												formData.privacy === 'public' && styles.privacyButtonActive,
											]}
											onPress={() => updateField('privacy', 'public')}
										>
											<Feather
												name="globe"
												size={16}
												color={formData.privacy === 'public' ? '#fff' : buddiColors.textPrimary}
											/>
											<Text
												style={[
													styles.privacyButtonText,
													formData.privacy === 'public' && styles.privacyButtonTextActive,
												]}
											>
												Public
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.privacyButton,
												formData.privacy === 'private' && styles.privacyButtonActive,
											]}
											onPress={() => updateField('privacy', 'private')}
										>
											<Feather
												name="lock"
												size={16}
												color={formData.privacy === 'private' ? '#fff' : buddiColors.textPrimary}
											/>
											<Text
												style={[
													styles.privacyButtonText,
													formData.privacy === 'private' && styles.privacyButtonTextActive,
												]}
											>
												Private
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							</View>
						)}

						{/* Step 2: Details & Photo */}
						{step === 2 && (
							<View style={styles.stepContent}>
								<Text style={styles.sectionTitle}>Details & Photo</Text>

								<View style={styles.field}>
									<Text style={styles.label}>Start Date</Text>
									<Pressable
										style={[styles.dateButton, errors.startDate && styles.inputError]}
										onPress={() => setShowStartPicker(true)}
									>
										<Feather name="calendar" size={18} color={buddiColors.textSecondary} />
										<Text style={formData.startDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
											{formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Select start date'}
										</Text>
									</Pressable>
									{showStartPicker && (
										<DateTimePicker
											value={startDateObj}
											mode="date"
											display={Platform.OS === 'ios' ? 'spinner' : 'default'}
											minimumDate={new Date()}
											onChange={(_e, date) => {
												if (Platform.OS === 'android') setShowStartPicker(false);
												if (date) {
													setStartDateObj(date);
													updateField('startDate', date.toISOString().slice(0, 10));
												}
											}}
										/>
									)}
									{Platform.OS === 'ios' && showStartPicker && (
										<Pressable onPress={() => setShowStartPicker(false)} style={styles.datePickerDone}>
											<Text style={styles.datePickerDoneText}>Done</Text>
										</Pressable>
									)}
									{errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>End Date</Text>
									<Pressable
										style={[styles.dateButton, errors.endDate && styles.inputError]}
										onPress={() => setShowEndPicker(true)}
									>
										<Feather name="calendar" size={18} color={buddiColors.textSecondary} />
										<Text style={formData.endDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
											{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Select end date'}
										</Text>
									</Pressable>
									{showEndPicker && (
										<DateTimePicker
											value={endDateObj}
											mode="date"
											display={Platform.OS === 'ios' ? 'spinner' : 'default'}
											minimumDate={startDateObj}
											onChange={(_e, date) => {
												if (Platform.OS === 'android') setShowEndPicker(false);
												if (date) {
													setEndDateObj(date);
													updateField('endDate', date.toISOString().slice(0, 10));
												}
											}}
										/>
									)}
									{Platform.OS === 'ios' && showEndPicker && (
										<Pressable onPress={() => setShowEndPicker(false)} style={styles.datePickerDone}>
											<Text style={styles.datePickerDoneText}>Done</Text>
										</Pressable>
									)}
									{errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Max Members</Text>
									<TextInput
										style={[styles.input, errors.maxMembers && styles.inputError]}
										placeholder="e.g., 10"
										keyboardType="numeric"
										value={formData.maxMembers?.toString() || '10'}
										onChangeText={(text) => {
											const num = parseInt(text);
											updateField('maxMembers', isNaN(num) ? 10 : num);
										}}
									/>
									{errors.maxMembers && (
										<Text style={styles.errorText}>{errors.maxMembers}</Text>
									)}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Estimated Cost</Text>
									<TextInput
										style={[styles.input, errors.estimatedCost && styles.inputError]}
										placeholder="Optional"
										keyboardType="decimal-pad"
										value={formData.estimatedCost || ''}
										onChangeText={(text) => updateField('estimatedCost', text)}
									/>
									{errors.estimatedCost && (
										<Text style={styles.errorText}>{errors.estimatedCost}</Text>
									)}
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>Group Photo</Text>
									<View style={styles.photoContainer}>
										<Pressable style={styles.photoButton}>
											<Feather name="camera" size={32} color={buddiColors.textSecondary} />
										</Pressable>
										<Pressable style={styles.choosePhotoButton}>
											<Text style={styles.choosePhotoButtonText}>Choose Photo</Text>
										</Pressable>
									</View>
								</View>
							</View>
						)}

						{/* Step 3: Add Participants */}
						{step === 3 && (
							<View style={styles.stepContent}>
								<Text style={styles.sectionTitle}>Add Participants</Text>
								<Text style={styles.subtitle}>Search your matches</Text>

								<View style={styles.searchContainer}>
									<Feather name="search" size={20} color={buddiColors.textSecondary} />
									<TextInput
										style={styles.searchInput}
										placeholder="Search by name or location..."
										placeholderTextColor={buddiColors.textSecondary}
										value={searchQuery}
										onChangeText={setSearchQuery}
									/>
								</View>

								<Text style={styles.sectionSubtitle}>Available users</Text>

								{isLoadingMatches ? (
									<View style={styles.participantsLoading}>
										<ActivityIndicator size="large" color={buddiColors.primary} />
										<Text style={styles.participantsLoadingText}>Loading matches...</Text>
									</View>
								) : filteredParticipants.length === 0 ? (
									<View style={styles.participantsEmpty}>
										<Feather name="users" size={40} color={buddiColors.textTertiary} />
										<Text style={styles.participantsEmptyText}>
											{matchProfiles.length === 0
												? 'No matches yet. Like profiles in Discover to match with travelers!'
												: 'No matches match your search.'}
										</Text>
									</View>
								) : (
									<View style={styles.participantsList}>
										{filteredParticipants.map((profile) => {
											const participantId = profile.userId ?? profile.id;
											const isSelected = formData.participants?.includes(participantId);
											const displayLocation = profile.location ?? profile.country ?? '';
											return (
												<TouchableOpacity
													key={participantId}
													style={[
														styles.participantItem,
														isSelected && styles.participantItemSelected,
													]}
													onPress={() => {
														if (isSelected) {
															removeParticipant(participantId);
														} else {
															addParticipant(participantId);
														}
													}}
												>
													<View style={styles.participantInfo}>
														<Text style={styles.participantName}>{profile.name || 'Unknown'}</Text>
														{displayLocation ? (
															<Text style={styles.participantLocation}>{displayLocation}</Text>
														) : null}
													</View>
													{isSelected && (
														<Feather name="check-circle" size={24} color={buddiColors.primary} />
													)}
												</TouchableOpacity>
											);
										})}
									</View>
								)}
							</View>
						)}
					</ScrollView>

					{/* Footer Buttons */}
					<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
						<View style={styles.footerMain}>
							<Pressable style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</Pressable>
							{step === 3 ? (
								<Pressable
									style={[styles.createButton, isSubmitting && styles.buttonDisabled]}
									onPress={handleSubmit}
									disabled={isSubmitting}
								>
									{isSubmitting ? (
										<ActivityIndicator size="small" color="#fff" />
									) : (
										<Text style={styles.createButtonText}>{mode === 'edit' ? 'Save changes' : 'Create Group'}</Text>
									)}
								</Pressable>
							) : (
								<Pressable
									style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
									onPress={handleNext}
									disabled={isSubmitting}
								>
									<Text style={styles.nextButtonText}>Next</Text>
								</Pressable>
							)}
						</View>
						{step > 1 && (
							<Pressable style={[styles.previousButton, isSubmitting && styles.buttonDisabled]} onPress={handlePrevious} disabled={isSubmitting}>
								<Text style={styles.previousButtonText}>Previous</Text>
							</Pressable>
						)}
					</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modal: {
		flex: 1,
		backgroundColor: buddiColors.surface,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: buddiColors.surfaceBorder,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: buddiColors.textPrimary,
	},
	closeButton: {
		padding: 4,
	},
	stepIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		paddingHorizontal: 20,
		direction: 'ltr',
	},
	stepCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: buddiColors.surfaceMuted,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepCircleActive: {
		backgroundColor: buddiColors.primary,
	},
	stepCircleComplete: {
		backgroundColor: buddiColors.badgeHighlight,
	},
	stepNumber: {
		fontSize: 14,
		fontWeight: '600',
		color: buddiColors.textSecondary,
	},
	stepNumberActive: {
		color: '#fff',
	},
	stepLine: {
		width: 40,
		height: 2,
		backgroundColor: buddiColors.surfaceBorder,
		marginHorizontal: 8,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	contentContainer: {
		paddingBottom: 20,
		flexGrow: 1,
	},
	stepContent: {
		paddingBottom: 20,
		paddingTop: 10,
		minHeight: 300,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: buddiColors.textPrimary,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: buddiColors.textSecondary,
		marginBottom: 16,
	},
	field: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: buddiColors.textPrimary,
		marginBottom: 8,
	},
	required: {
		color: buddiColors.dangerText,
	},
	input: {
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	inputError: {
		borderColor: buddiColors.dangerText,
	},
	textArea: {
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: buddiColors.textPrimary,
		minHeight: 100,
		textAlignVertical: 'top',
	},
	errorText: {
		fontSize: 12,
		color: buddiColors.dangerText,
		marginTop: 4,
	},
	selectContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	selectText: {
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	optionsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
		direction: 'ltr',
	},
	option: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	optionSelected: {
		backgroundColor: buddiColors.primary,
		borderColor: buddiColors.primary,
	},
	optionText: {
		fontSize: 14,
		color: buddiColors.textPrimary,
	},
	optionTextSelected: {
		color: '#fff',
		fontWeight: '600',
	},
	tagInputContainer: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	tagInput: {
		flex: 1,
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	addTagButton: {
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: buddiColors.primary,
		justifyContent: 'center',
	},
	addTagButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: buddiColors.primary,
	},
	tagsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: buddiColors.primaryMuted,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	tagText: {
		fontSize: 12,
		color: buddiColors.primaryDark,
		fontWeight: '500',
	},
	privacyContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	privacyButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
		borderRadius: 12,
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	privacyButtonActive: {
		backgroundColor: buddiColors.primary,
		borderColor: buddiColors.primary,
	},
	privacyButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: buddiColors.textPrimary,
	},
	privacyButtonTextActive: {
		color: '#fff',
	},
	photoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	photoButton: {
		width: 120,
		height: 120,
		backgroundColor: buddiColors.surfaceMuted,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	choosePhotoButton: {
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	choosePhotoButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: buddiColors.textPrimary,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 16,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	sectionSubtitle: {
		fontSize: 16,
		fontWeight: '600',
		color: buddiColors.textPrimary,
		marginBottom: 12,
	},
	participantsLoading: {
		paddingVertical: 40,
		alignItems: 'center',
		gap: 12,
	},
	participantsLoadingText: {
		fontSize: 14,
		color: buddiColors.textSecondary,
	},
	participantsEmpty: {
		paddingVertical: 40,
		alignItems: 'center',
		gap: 12,
	},
	participantsEmptyText: {
		fontSize: 14,
		color: buddiColors.textSecondary,
		textAlign: 'center',
	},
	participantsList: {
		gap: 12,
	},
	participantItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		backgroundColor: buddiColors.background,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	participantItemSelected: {
		borderColor: buddiColors.primary,
		backgroundColor: buddiColors.primaryMuted,
	},
	participantInfo: {
		flex: 1,
	},
	participantName: {
		fontSize: 16,
		fontWeight: '600',
		color: buddiColors.textPrimary,
		marginBottom: 4,
	},
	participantLocation: {
		fontSize: 14,
		color: buddiColors.textSecondary,
	},
	footer: {
		flexDirection: 'column',
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 0,
		borderTopWidth: 1,
		borderTopColor: buddiColors.surfaceBorder,
		gap: 10,
	},
	footerMain: {
		flexDirection: 'row',
		gap: 12,
		direction: 'ltr',
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.surface,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: buddiColors.textPrimary,
	},
	nextButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.primary,
		alignItems: 'center',
	},
	nextButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
	createButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.primary,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	createButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
	previousButton: {
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.surface,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		alignItems: 'center',
	},
	previousButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: buddiColors.textPrimary,
	},
	dateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	dateButtonText: {
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	dateButtonPlaceholder: {
		fontSize: 16,
		color: buddiColors.textSecondary,
	},
	datePickerDone: {
		alignItems: 'flex-end',
		paddingVertical: 8,
	},
	datePickerDoneText: {
		fontSize: 16,
		fontWeight: '600',
		color: buddiColors.primary,
	},
});