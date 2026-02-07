/**
 * TopicScoreCircle - Small circular score indicator for per-topic scores
 * 
 * Used in Evaluation Form and Garden Detail topic cards
 * Shows score number and "puan" label in a compact circle
 */

import React from "react";

interface TopicScoreCircleProps {
  score: number; // 0–100
}

export const TopicScoreCircle: React.FC<TopicScoreCircleProps> = ({ score }) => (
  <div className="flex h-10 w-10 flex-col items-center justify-center rounded-full border border-border bg-white shadow-sm">
    <span className="text-[13px] font-semibold leading-tight">{score}</span>
    <span className="text-[10px] leading-none text-muted-foreground">puan</span>
  </div>
);

export default TopicScoreCircle;
