import { useEffect, useState } from "react";

interface ScoreCircleProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  showMax?: boolean;
  change?: number;
}

const ScoreCircle = ({ 
  score, 
  maxScore = 100, 
  size = "md", 
  showMax = false,
  change 
}: ScoreCircleProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const percentage = (score / maxScore) * 100;
  
  const getColor = () => {
    if (percentage >= 75) return "hsl(142 52% 42%)";
    if (percentage >= 50) return "hsl(45 85% 55%)";
    return "hsl(15 80% 50%)";
  };
  
  const sizeConfig = {
    sm: { width: 56, strokeWidth: 4, fontSize: "text-base", subSize: "text-[10px]" },
    md: { width: 76, strokeWidth: 5, fontSize: "text-xl", subSize: "text-xs" },
    lg: { width: 100, strokeWidth: 6, fontSize: "text-2xl", subSize: "text-sm" },
  };
  
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / maxScore) * circumference;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={config.strokeWidth}
        />
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${config.fontSize} font-bold text-foreground leading-none`}>
          {score}
        </span>
        {showMax && (
          <span className={`${config.subSize} text-muted-foreground`}>
            /100
          </span>
        )}
        {change !== undefined && (
          <span className={`${config.subSize} flex items-center gap-0.5 ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
            {change >= 0 ? '+' : ''}{change}
          </span>
        )}
      </div>
    </div>
  );
};

export default ScoreCircle;
