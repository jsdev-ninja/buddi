import Svg, { Path } from "react-native-svg";
import { buddiColors } from "@/constants/theme";

type LogoIconProps = {
	size?: number;
	color?: string;
};

export function LogoIcon({ size = 24, color = buddiColors.primary }: LogoIconProps) {
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<Path d="m8 3 4 8 5-5 5 15H2L8 3z" />
		</Svg>
	);
}
