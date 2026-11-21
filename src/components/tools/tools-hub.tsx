"use client";

import { EyeOff, ScanFace } from "lucide-react";

import { ModelLoader } from "@/components/camera/model-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFaceEngine } from "@/hooks/use-face-engine";

import { FaceCompare } from "./face-compare";
import { PrivacyBlur } from "./privacy-blur";

/** Phase 7 image tools. Everything runs in the browser with the on-device face engine. */
export function ToolsHub() {
  const engine = useFaceEngine();
  return (
    <div className="grid gap-4">
      {!engine.ready ? (
        <div className="relative min-h-32 rounded-xl border">
          <ModelLoader
            status={engine.status}
            stage={engine.stage}
            progress={engine.progress}
            error={engine.error}
            onRetry={engine.retry}
          />
        </div>
      ) : null}
      <Tabs defaultValue="compare">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="compare">
            <ScanFace aria-hidden /> Face compare
          </TabsTrigger>
          <TabsTrigger value="blur">
            <EyeOff aria-hidden /> Privacy blur
          </TabsTrigger>
        </TabsList>
        <TabsContent value="compare" className="pt-4">
          <FaceCompare ready={engine.ready} />
        </TabsContent>
        <TabsContent value="blur" className="pt-4">
          <PrivacyBlur ready={engine.ready} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
