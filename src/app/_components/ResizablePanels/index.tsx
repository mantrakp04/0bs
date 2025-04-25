"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
// import { Messages } from "../messages";
import { ChatInput } from "../input";
import { usePanelStore } from "@/store/panelStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Artifacts } from "./Artifacts";
import { Sources } from "./Sources";
import { Settings } from "./Settings";
import type { ComponentProps } from "react";
import type { TabValue } from "@/store/panelStore";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizablePanelsProps
  extends Partial<ComponentProps<typeof ResizablePanel>> {
  children: React.ReactNode;
}

export function ResizablePanels({
  children,
  ...panelProps
}: ResizablePanelsProps) {
  const isPanelVisible = usePanelStore((state) => state.isPanelVisible);
  const activeTab = usePanelStore((state) => state.activeTab);
  const setActiveTab = usePanelStore((state) => state.setActiveTab);
  const togglePanel = usePanelStore((state) => state.togglePanel);
  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel
        defaultSize={50}
        className="flex flex-col items-center justify-center gap-1"
        {...panelProps}
      >
        {children}
        <ChatInput />
      </ResizablePanel>

      {isPanelVisible && (
        <>
          <ResizableHandle
            withHandle
            className="transition-opacity duration-300 ease-in-out"
          />

          <ResizablePanel
            minSize={15}
            maxSize={40}
            className="p-2 transition-all duration-300 ease-in-out"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabValue)}
              className="h-full"
            >
              <div className="flex flex-row justify-between">
                <Button variant="ghost" size="icon" onClick={togglePanel}>
                  <XIcon />
                </Button>
                <TabsList className="w-full rounded-md">
                  <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="artifacts">
                <Artifacts />
              </TabsContent>
              <TabsContent value="sources">
                <Sources />
              </TabsContent>
              <TabsContent value="settings">
                <Settings />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
