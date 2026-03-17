"use client";

import dynamic from "next/dynamic";
import { useInView } from "framer-motion";
import { useRef, ComponentType } from "react";

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false }
);

interface FeaturePlayerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
}

export function FeaturePlayer({
  component,
  durationInFrames,
  fps,
  compositionWidth,
  compositionHeight,
}: FeaturePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-10% 0px -10% 0px" });

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {isInView && (
        <Player
          component={component}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          loop
          autoPlay
          controls={false}
          clickToPlay={false}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
