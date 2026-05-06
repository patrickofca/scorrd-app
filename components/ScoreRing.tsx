import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Colors, scoreColor } from '../constants/colors';
import { FontFamily } from '../constants/typography';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ score, size = 140, strokeWidth = 12 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 10) * circumference;
  const color = scoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={size} height={size}>
      {/* Background track */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={Colors.surfaceElevated}
        strokeWidth={strokeWidth}
      />
      {/* Filled arc — rotated so it starts at 12 o'clock */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Score number */}
      <SvgText
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontFamily={FontFamily.serif}
        fill={color}
      >
        {score.toFixed(1)}
      </SvgText>
      {/* "/10" label */}
      <SvgText
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fontSize={size * 0.1}
        fontFamily={FontFamily.sans}
        fill={Colors.textSecondary}
      >
        out of 10
      </SvgText>
    </Svg>
  );
}
