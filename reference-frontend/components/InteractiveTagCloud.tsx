"use client";

import { useMemo } from "react";
// Import the component AND its type definitions
import { TagCloud, ColorOptions } from "react-tagcloud";

interface InteractiveTagCloudProps {
  data: string[];
}

interface TagData {
  value: string;
  count: number;
}

export default function InteractiveTagCloud({
  data,
}: InteractiveTagCloudProps) {
  const tags: TagData[] = useMemo(() => {
    return data.map((tag) => ({
      value: tag,
      count: Math.floor(Math.random() * (30 - 10 + 1) + 10), // Random count between 10 and 30
    }));
  }, [data]);

  // Explicitly type the `colorOptions` object
  const colorOptions: ColorOptions = {
    luminosity: "dark",
    hue: "cyan",
  };

  return (
    <div className="w-full min-h-full flex items-start justify-center p-4 cursor-default ">
      <TagCloud
        minSize={12}
        maxSize={35}
        tags={tags}
        colorOptions={colorOptions}
        className="text-center font-sans font-semibold"
      />
    </div>
  );
}
