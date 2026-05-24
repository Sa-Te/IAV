"use client";

import { useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

interface ActivityLog {
  timestamp: string;
}

interface ActivityHeatmapProps {
  data: ActivityLog[];
}

// Function to get the date range for the last year
const getYearAgoDate = () => {
  const today = new Date();
  const yearAgo = new Date();
  yearAgo.setFullYear(today.getFullYear() - 1);
  return { start: yearAgo, end: today };
};

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { start, end } = getYearAgoDate();

  const heatmapData = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach((item) => {
      const date = new Date(item.timestamp).toISOString().slice(0, 10); // "YYYY-MM-DD"
      counts.set(date, (counts.get(date) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }, [data]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-8 heatmap-container">
      <style>{`
        .heatmap-container .react-calendar-heatmap .color-empty { fill: #2d3748; }
        .heatmap-container .react-calendar-heatmap .color-scale-1 { fill: #4a5568; }
        .heatmap-container .react-calendar-heatmap .color-scale-2 { fill: #2b6cb0; }
        .heatmap-container .react-calendar-heatmap .color-scale-3 { fill: #00a3c4; }
        .heatmap-container .react-calendar-heatmap .color-scale-4 { fill: #4fd1c5; }
        .react-calendar-heatmap text { font-size: 8px; fill: #a0aec0; }
      `}</style>
      <CalendarHeatmap
        startDate={start}
        endDate={end}
        values={heatmapData}
        classForValue={(value) => {
          if (!value) {
            return "color-empty";
          }
          if (value.count > 15) return "color-scale-4";
          if (value.count > 10) return "color-scale-3";
          if (value.count > 5) return "color-scale-2";
          return "color-scale-1";
        }}
        showWeekdayLabels={true}
      />
    </div>
  );
}
